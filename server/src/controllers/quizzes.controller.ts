import { Request, Response } from "express";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../db";
import { users, students, activities, questions, quizAttempts, quizAnswers, materials } from "../db/schema";
import { ApiError } from "../utils/errors";
import { attemptSubmitSchema } from "../validators";
import { notifyAllStudents } from "../utils/helpers";

async function checkActivityVisible(studentUserId: string, activityId: string) {
  const db = getDb();
  const [act] = await db
    .select({ a: activities, courseId: students.courseId, batch: students.batch })
    .from(activities)
    .innerJoin(students, eq(students.userId, studentUserId))
    .where(and(eq(activities.id, activityId), isNull(activities.deletedAt)))
    .limit(1);
  if (!act || act.a.status !== "published")
    throw ApiError.forbidden("This quiz is not available");
  const ok =
    act.a.courseId === null ||
    act.a.courseId === act.courseId ||
    act.a.batch === act.batch;
  if (!ok) throw ApiError.forbidden("This quiz is not available to your course/batch");
  return act.a;
}

function publicQuestion(q: any) {
  return {
    id: q.id,
    text: q.text,
    imageFileId: q.imageFileId,
    imageUrl: q.imageFileId ? `/api/files/${q.imageFileId}` : null,
    options: q.options,
    marks: q.marks,
    difficulty: q.difficulty,
    topic: q.topic,
    orderIndex: q.orderIndex,
  };
}

async function attemptSummary(studentUserId: string, activityId: string) {
  const db = getDb();
  const rows = await db
    .select({ status: quizAttempts.status, attemptNo: quizAttempts.attemptNo })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.studentUserId, studentUserId), eq(quizAttempts.activityId, activityId)));
  const used = rows.length;
  return { attemptsUsed: used, hasInProgress: rows.some((r) => r.status === "in_progress") };
}

export async function getQuiz(req: Request, res: Response) {
  const studentUserId = (req as any).user.id;
  const activity = await checkActivityVisible(studentUserId, String(req.params.activityId));
  const db = getDb();
  const qs = await db.select().from(questions).where(eq(questions.activityId, activity.id)).orderBy(questions.orderIndex);
  const maxAttempts = activity.maxAttempts;
  const sum = await attemptSummary(studentUserId, activity.id);
  const attemptsLeft = Math.max(0, maxAttempts - sum.attemptsUsed);
  res.json({
    quiz: {
      activityId: activity.id,
      title: activity.title,
      description: activity.description,
      type: activity.type,
      timeLimitMinutes: activity.timeLimitMinutes,
      passingScore: activity.passingScore,
      totalMarks: activity.totalMarks,
      questionCount: qs.length,
      questions: qs.map(publicQuestion),
    },
    attemptsLeft,
    attemptsUsed: sum.attemptsUsed,
    canStart: attemptsLeft > 0 && !sum.hasInProgress,
  });
}

export async function startQuiz(req: Request, res: Response) {
  const studentUserId = (req as any).user.id;
  const activity = await checkActivityVisible(studentUserId, String(req.params.activityId));
  const db = getDb();
  const sum = await attemptSummary(studentUserId, activity.id);
  if (sum.hasInProgress) throw ApiError.badRequest("You already have an attempt in progress");
  if (sum.attemptsUsed >= activity.maxAttempts)
    throw ApiError.forbidden("Maximum attempts reached");

  const attemptNo = sum.attemptsUsed + 1;
  const startedAt = new Date();
  const deadlineAt = new Date(startedAt.getTime() + activity.timeLimitMinutes * 60 * 1000);
  const [attempt] = await db
    .insert(quizAttempts)
    .values({
      activityId: activity.id,
      studentUserId,
      attemptNo,
      status: "in_progress",
      startedAt,
      deadlineAt,
    })
    .returning();

  const qs = await db.select().from(questions).where(eq(questions.activityId, activity.id)).orderBy(questions.orderIndex);
  res.json({
    attemptId: attempt.id,
    attemptNo,
    deadlineAt: deadlineAt.toISOString(),
    timeLimitMinutes: activity.timeLimitMinutes,
    totalMarks: activity.totalMarks,
    questions: qs.map(publicQuestion),
  });
}

export async function submitQuiz(req: Request, res: Response) {
  const studentUserId = (req as any).user.id;
  const { answers } = attemptSubmitSchema.parse(req.body);
  const db = getDb();

  const [attempt] = await db
    .select()
    .from(quizAttempts)
    .where(eq(quizAttempts.id, String(req.params.attemptId)))
    .limit(1);
  if (!attempt) throw ApiError.notFound("Attempt not found");
  if (attempt.studentUserId !== studentUserId) throw ApiError.forbidden("Not your attempt");
  if (attempt.status === "submitted") throw ApiError.badRequest("Already submitted");
  if (attempt.status === "expired") throw ApiError.badRequest("Attempt expired");

  const activityId = attempt.activityId;
  // fetch correct answers server-side (never trust client)
  const qs = await db.select().from(questions).where(eq(questions.activityId, activityId));
  const qMap = new Map(qs.map((q) => [q.id, q]));

  const now = new Date();
  let expired = false;
  if (attempt.deadlineAt && attempt.deadlineAt < now) {
    expired = true;
  }

  let score = 0;
  let total = 0;
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  const answerRows: any[] = [];

  for (const q of qs) {
    total += q.marks;
    const a = answers.find((x) => x.questionId === q.id);
    const selected = a?.selectedKey ?? null;
    const isCorrect = selected != null && selected === q.correctKey;
    if (isCorrect) {
      correct += 1;
      score += q.marks;
    } else if (selected == null) {
      unanswered += 1;
    } else {
      wrong += 1;
    }
    answerRows.push({
      attemptId: attempt.id,
      questionId: q.id,
      selectedKey: selected,
      isCorrect,
      marksAwarded: isCorrect ? q.marks : 0,
    });
  }

  const percentage = total > 0 ? Math.round((score / total) * 1000) / 10 : 0;
  const passed = !expired && percentage >= (attempt ? await getPassing(activityId) : 50);

  const submittedAt = now;
  const timeTakenSeconds = Math.max(
    0,
    Math.round((submittedAt.getTime() - new Date(attempt.startedAt).getTime()) / 1000)
  );

  await db.insert(quizAnswers).values(answerRows);
  await db
    .update(quizAttempts)
    .set({
      status: expired ? "expired" : "submitted",
      submittedAt,
      deadlineAt: attempt.deadlineAt,
      score,
      totalMarks: total,
      percentage,
      correctCount: correct,
      wrongCount: wrong,
      unansweredCount: unanswered,
      timeTakenSeconds,
      passed: expired ? false : passed,
    })
    .where(eq(quizAttempts.id, attempt.id));

  // notify student of result
  await notifyResult(studentUserId, activityId, percentage, passed);

  res.json(await buildResult(attempt.id, studentUserId, true));
}

async function getPassing(activityId: string): Promise<number> {
  const [a] = await getDb().select({ p: activities.passingScore }).from(activities).where(eq(activities.id, activityId)).limit(1);
  return a?.p ?? 50;
}

async function notifyResult(studentUserId: string, activityId: string, percentage: number, passed: boolean) {
  const [act] = await getDb().select({ title: activities.title }).from(activities).where(eq(activities.id, activityId)).limit(1);
  await getDb().insert(require("../db/schema").notifications).values({
    userId: studentUserId,
    type: "result",
    title: `Quiz result: ${act?.title ?? "Quiz"}`,
    body: `You scored ${percentage}% — ${passed ? "passed" : "not passed"}.`,
    linkUrl: `/student/activities/${activityId}`,
    entityId: activityId,
  });
}

export async function getResult(req: Request, res: Response) {
  const isAdmin = (req as any).user.role === "admin";
  const studentUserId = (req as any).user.id;
  const db = getDb();
  const [attempt] = await db.select().from(quizAttempts).where(eq(quizAttempts.id, String(req.params.attemptId))).limit(1);
  if (!attempt) throw ApiError.notFound("Result not found");
  if (!isAdmin && attempt.studentUserId !== studentUserId)
    throw ApiError.forbidden("Not your result");
  res.json(await buildResult(attempt.id, attempt.studentUserId, isAdmin));
}

async function buildResult(attemptId: string, studentUserId: string, includeAnswers: boolean) {
  const db = getDb();
  const [attempt] = await db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId)).limit(1);
  const ans = await db.select().from(quizAnswers).where(eq(quizAnswers.attemptId, attemptId));
  const qs = await db.select().from(questions).where(eq(questions.activityId, attempt.activityId)).orderBy(questions.orderIndex);
  const ansMap = new Map(ans.map((a) => [a.questionId, a]));

  const detail = qs.map((q) => {
    const a = ansMap.get(q.id);
    return {
      id: q.id,
      text: q.text,
      imageUrl: q.imageFileId ? `/api/files/${q.imageFileId}` : null,
      options: q.options,
      selectedKey: a?.selectedKey ?? null,
      correctKey: includeAnswers ? q.correctKey : undefined,
      isCorrect: a?.isCorrect ?? false,
      explanation: q.explanation,
      marks: q.marks,
      marksAwarded: a?.marksAwarded ?? 0,
    };
  });

  return {
    result: {
      attemptId: attempt.id,
      activityId: attempt.activityId,
      attemptNo: attempt.attemptNo,
      status: attempt.status,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      percentage: attempt.percentage,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      unansweredCount: attempt.unansweredCount,
      timeTakenSeconds: attempt.timeTakenSeconds,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt,
    },
    questions: detail,
  };
}

export async function getStudentAttempts(req: Request, res: Response) {
  const studentUserId = (req as any).user.id;
  const db = getDb();
  const rows = await db
    .select({
      id: quizAttempts.id,
      activityId: quizAttempts.activityId,
      attemptNo: quizAttempts.attemptNo,
      status: quizAttempts.status,
      score: quizAttempts.score,
      totalMarks: quizAttempts.totalMarks,
      percentage: quizAttempts.percentage,
      passed: quizAttempts.passed,
      submittedAt: quizAttempts.submittedAt,
    })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.studentUserId, studentUserId), eq(quizAttempts.status, "submitted")))
    .orderBy(desc(quizAttempts.submittedAt));
  res.json({ attempts: rows });
}
