import { Request, Response } from "express";
import { and, desc, eq, isNull, like, or, sql, count } from "drizzle-orm";
import { getDb } from "../db";
import {
  users,
  students,
  activities,
  questions,
  quizAttempts,
  subjects,
  courses,
} from "../db/schema";
import { ApiError } from "../utils/errors";
import {
  createActivitySchema,
  updateActivitySchema,
  paginationSchema,
} from "../validators";
import { buildPagination, notifyAllStudents } from "../utils/helpers";

function scopeCond(userId: string) {
  return getDb()
    .select({ courseId: students.courseId, batch: students.batch })
    .from(students)
    .where(eq(students.userId, userId))
    .limit(1);
}

function shapeQuestion(q: any, includeAnswer: boolean) {
  const base = {
    id: q.id,
    text: q.text,
    imageFileId: q.imageFileId,
    imageUrl: q.imageFileId ? `/api/files/${q.imageFileId}` : null,
    options: q.options,
    marks: q.marks,
    difficulty: q.difficulty,
    topic: q.topic,
    orderIndex: q.orderIndex,
    explanation: includeAnswer ? q.explanation : undefined,
  };
  if (includeAnswer) (base as any).correctKey = q.correctKey;
  return base;
}

async function attemptSummary(studentUserId: string, activityId: string) {
  const db = getDb();
  const rows = await db
    .select({
      status: quizAttempts.status,
      percentage: quizAttempts.percentage,
      attemptNo: quizAttempts.attemptNo,
    })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.studentUserId, studentUserId), eq(quizAttempts.activityId, activityId)));
  const submitted = rows.filter((r) => r.status === "submitted");
  const best = submitted.reduce((m, r) => Math.max(m, Number(r.percentage ?? 0)), 0);
  const latest = rows.sort((a, b) => (b.attemptNo ?? 0) - (a.attemptNo ?? 0))[0];
  return {
    attempted: submitted.length > 0,
    attemptsUsed: rows.length,
    bestPercentage: best,
    status: latest?.status ?? null,
  };
}

function serializeActivity(row: any, includeQuestions: boolean, includeAnswer: boolean): any {
  return {
    id: row.a.id,
    title: row.a.title,
    description: row.a.description,
    type: row.a.type,
    activityDate: row.a.activityDate,
    startTime: row.a.startTime,
    endTime: row.a.endTime,
    subjectId: row.a.subjectId,
    subjectName: row.s?.name ?? null,
    courseId: row.a.courseId,
    courseName: row.c?.name ?? null,
    batch: row.a.batch,
    timeLimitMinutes: row.a.timeLimitMinutes,
    passingScore: row.a.passingScore,
    maxAttempts: row.a.maxAttempts,
    status: row.a.status,
    isDaily: row.a.isDaily,
    totalMarks: row.a.totalMarks,
    questionCount: row.qc ?? 0,
    createdAt: row.a.createdAt,
    questions: includeQuestions
      ? (row.questions || []).map((q: any) => shapeQuestion(q, includeAnswer))
      : undefined,
  };
}

export async function listActivities(req: Request, res: Response) {
  const isAdmin = (req as any).user.role === "admin";
  const { page, pageSize, q, sort } = paginationSchema.parse(req.query);
  const type = req.query.type as string | undefined;
  const status = req.query.status as string | undefined;

  const db = getDb();
  const conditions = [isNull(activities.deletedAt)];
  if (type) conditions.push(eq(activities.type, type as any));
  if (!isAdmin) {
    conditions.push(eq(activities.status, "published"));
    const [scope] = await scopeCond((req as any).user.id);
    conditions.push(
      sql`(${activities.courseId} is null OR ${activities.courseId} = ${scope?.courseId ?? null} OR ${activities.batch} = ${scope?.batch ?? ""})`
    );
  } else if (status) {
    conditions.push(eq(activities.status, status as any));
  }
  if (q) conditions.push(like(activities.title, `%${q}%`));

  const where = and(...(conditions.filter(Boolean) as any));
  const [{ total }] = await db.select({ total: count() }).from(activities).where(where);
  const orderExpr =
    sort === "date_asc" ? activities.activityDate : sort === "newest" ? desc(activities.createdAt) : desc(activities.activityDate);

  const rows = await db
    .select({ a: activities, s: subjects, c: courses, qc: sql<number>`cast(count(${questions.id}) as int)` })
    .from(activities)
    .leftJoin(subjects, eq(activities.subjectId, subjects.id))
    .leftJoin(courses, eq(activities.courseId, courses.id))
    .leftJoin(questions, eq(questions.activityId, activities.id))
    .where(where)
    .groupBy(activities.id, subjects.id, courses.id)
    .orderBy(orderExpr)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const result = [];
  for (const r of rows) {
    const item = serializeActivity(r, false, false);
    if (!isAdmin) {
      item.attempt = await attemptSummary((req as any).user.id, r.a.id);
    }
    result.push(item);
  }

  res.json({ activities: result, pagination: buildPagination(Number(total), page, pageSize) });
}

export async function getToday(req: Request, res: Response) {
  const db = getDb();
  const [scope] = await scopeCond((req as any).user.id);
  const rows = await db
    .select({ a: activities, s: subjects, c: courses, qc: sql<number>`cast(count(${questions.id}) as int)` })
    .from(activities)
    .leftJoin(subjects, eq(activities.subjectId, subjects.id))
    .leftJoin(courses, eq(activities.courseId, courses.id))
    .leftJoin(questions, eq(questions.activityId, activities.id))
    .where(
      and(
        isNull(activities.deletedAt),
        eq(activities.status, "published"),
        eq(activities.activityDate, sql`current_date`),
        sql`(${activities.courseId} is null OR ${activities.courseId} = ${scope?.courseId ?? null} OR ${activities.batch} = ${scope?.batch ?? ""})`
      )
    )
    .groupBy(activities.id, subjects.id, courses.id)
    .orderBy(activities.startTime);

  const result = [];
  for (const r of rows) {
    const item = serializeActivity(r, false, false);
    item.attempt = await attemptSummary((req as any).user.id, r.a.id);
    result.push(item);
  }
  res.json({ activities: result });
}

export async function getActivity(req: Request, res: Response) {
  const isAdmin = (req as any).user.role === "admin";
  const db = getDb();
  const [base] = await db
    .select({ a: activities, s: subjects, c: courses })
    .from(activities)
    .leftJoin(subjects, eq(activities.subjectId, subjects.id))
    .leftJoin(courses, eq(activities.courseId, courses.id))
    .where(and(eq(activities.id, String(req.params.id)), isNull(activities.deletedAt)))
    .limit(1);
  if (!base) throw ApiError.notFound("Activity not found");
  if (!isAdmin && base.a.status !== "published") throw ApiError.forbidden("Not available");

  const qs = await db.select().from(questions).where(eq(questions.activityId, base.a.id)).orderBy(questions.orderIndex);
  const item = serializeActivity({ ...base, qc: qs.length, questions: qs }, true, isAdmin);
  if (!isAdmin) item.attempt = await attemptSummary((req as any).user.id, base.a.id);
  res.json({ activity: item });
}

export async function createActivity(req: Request, res: Response) {
  const data = createActivitySchema.parse(req.body);
  const db = getDb();
  const totalMarks = data.questions.reduce((sum, q) => sum + (q.marks ?? 1), 0);
  const [activity] = await db
    .insert(activities)
    .values({
      title: data.title.trim(),
      description: data.description || null,
      type: data.type,
      activityDate: new Date(data.activityDate).toISOString().slice(0, 10),
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      subjectId: data.subjectId || null,
      courseId: data.courseId || null,
      batch: data.batch || null,
      timeLimitMinutes: data.timeLimitMinutes ?? 10,
      passingScore: data.passingScore ?? 50,
      maxAttempts: data.maxAttempts ?? 1,
      status: data.status ?? "draft",
      isDaily: data.isDaily ?? false,
      totalMarks,
      createdBy: (req as any).user.id,
    })
    .returning();

  await db.insert(questions).values(
    data.questions.map((q, i) => ({
      activityId: activity.id,
      text: q.text,
      imageFileId: q.imageFileId || null,
      options: q.options,
      correctKey: q.correctKey,
      explanation: q.explanation || null,
      marks: q.marks ?? 1,
      difficulty: q.difficulty ?? "medium",
      topic: q.topic || null,
      orderIndex: q.orderIndex ?? i,
    }))
  );

  if (data.status === "published") {
    await notifyAllStudents({
      type: "activity",
      title: "New activity available",
      body: `${data.type === "mcq" || data.type === "quiz" ? "Quiz" : "Activity"} "${data.title}" is now available.`,
      linkUrl: `/student/activities/${activity.id}`,
      entityId: activity.id,
    });
  }
  res.status(201).json({ activity: serializeActivity({ a: activity, s: null, c: null, qc: data.questions.length }, false, false) });
}

export async function updateActivity(req: Request, res: Response) {
  const data = updateActivitySchema.parse(req.body);
  const db = getDb();
  const [existing] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.id, String(req.params.id)), isNull(activities.deletedAt)))
    .limit(1);
  if (!existing) throw ApiError.notFound("Activity not found");
  const wasPublished = existing.status === "published";

  const totalMarks = data.questions
    ? data.questions.reduce((sum, q) => sum + (q.marks ?? 1), 0)
    : existing.totalMarks;

  await db
    .update(activities)
    .set({
      title: data.title?.trim() ?? existing.title,
      description: data.description ?? existing.description,
      type: data.type ?? existing.type,
      activityDate: data.activityDate ? new Date(data.activityDate).toISOString().slice(0, 10) : existing.activityDate,
      startTime: data.startTime ?? existing.startTime,
      endTime: data.endTime ?? existing.endTime,
      subjectId: data.subjectId ?? existing.subjectId,
      courseId: data.courseId ?? existing.courseId,
      batch: data.batch ?? existing.batch,
      timeLimitMinutes: data.timeLimitMinutes ?? existing.timeLimitMinutes,
      passingScore: data.passingScore ?? existing.passingScore,
      maxAttempts: data.maxAttempts ?? existing.maxAttempts,
      status: data.status ?? existing.status,
      isDaily: data.isDaily ?? existing.isDaily,
      totalMarks,
      updatedAt: new Date(),
    })
    .where(eq(activities.id, existing.id));

  if (data.questions) {
    // replace questions
    await db.delete(questions).where(eq(questions.activityId, existing.id));
    await db.insert(questions).values(
      data.questions.map((qq, i) => ({
        activityId: existing.id,
        text: qq.text,
        imageFileId: qq.imageFileId || null,
        options: qq.options,
        correctKey: qq.correctKey,
        explanation: qq.explanation || null,
        marks: qq.marks ?? 1,
        difficulty: qq.difficulty ?? "medium",
        topic: qq.topic || null,
        orderIndex: qq.orderIndex ?? i,
      }))
    );
  }

  if (data.status === "published" && !wasPublished) {
    await notifyAllStudents({
      type: "activity",
      title: "New activity available",
      body: `${existing.type === "mcq" || existing.type === "quiz" ? "Quiz" : "Activity"} "${data.title ?? existing.title}" is now available.`,
      linkUrl: `/student/activities/${existing.id}`,
      entityId: existing.id,
    });
  }
  res.json({ success: true, status: data.status ?? existing.status });
}

export async function patchActivityStatus(req: Request, res: Response) {
  const status = req.body?.status as "draft" | "published" | "archived" | undefined;
  if (!["draft", "published", "archived"].includes(status as string))
    throw ApiError.badRequest("Invalid status");
  const db = getDb();
  const [existing] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.id, String(req.params.id)), isNull(activities.deletedAt)))
    .limit(1);
  if (!existing) throw ApiError.notFound("Activity not found");
  const wasPublished = existing.status === "published";
  await db.update(activities).set({ status, updatedAt: new Date() }).where(eq(activities.id, existing.id));
  if (status === "published" && !wasPublished) {
    await notifyAllStudents({
      type: "activity",
      title: "New activity available",
      body: `${existing.type === "mcq" || existing.type === "quiz" ? "Quiz" : "Activity"} "${existing.title}" is now available.`,
      linkUrl: `/student/activities/${existing.id}`,
      entityId: existing.id,
    });
  }
  res.json({ success: true, status });
}

export async function deleteActivity(req: Request, res: Response) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.id, String(req.params.id)), isNull(activities.deletedAt)))
    .limit(1);
  if (!existing) throw ApiError.notFound("Activity not found");
  await db.update(activities).set({ deletedAt: new Date(), status: "archived" }).where(eq(activities.id, existing.id));
  res.json({ success: true });
}
