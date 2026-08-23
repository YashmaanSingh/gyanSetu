import type { Request, Response } from "express";
import { and, asc, desc, eq, sql, count } from "drizzle-orm";
import { getDb } from "../db";
import {
  users,
  students,
  classes,
  subjects,
  chapters,
  dailyTasks,
  dailyTaskQuestions,
  dailyTaskOptions,
  dailyTaskSubmissions,
  dailyTaskAnswers,
  notifications,
} from "../db/schema";
import { ApiError } from "../utils/errors";
import { notifyAllStudents } from "../utils/helpers";
import {
  createDailyTaskSchema,
  updateDailyTaskSchema,
  dailySubmitSchema,
  dailyReviewSchema,
  paginationSchema,
} from "../validators";

function studentClassName(raw: string | null | undefined): string {
  if (!raw) return "";
  const grade = raw.replace(/st|nd|rd|th/g, "").trim();
  return `Class ${grade}`;
}

// Resolve the curriculum class row for a student (used for class-targeted access).
async function resolveStudentClass(userId: string) {
  const db = getDb();
  const [stu] = await db
    .select({ className: students.className })
    .from(students)
    .where(eq(students.userId, userId))
    .limit(1);
  if (!stu || !stu.className) return null;
  const name = studentClassName(stu.className);
  const cls = await db
    .select()
    .from(classes)
    .where(and(eq(classes.name, name), eq(classes.status, "active")))
    .limit(1);
  return cls[0] ? { id: cls[0].id, name } : null;
}

function shapeQuestionForStudent(q: any, type: string) {
  const base: any = {
    id: q.id,
    text: q.text,
    marks: q.marks,
    orderIndex: q.orderIndex,
    explanation: q.explanation,
  };
  if (type === "mcq" || type === "truefalse") {
    base.options = (q.options || []).map((o: any) => ({ key: o.key, text: o.text }));
  }
  return base;
}

async function buildStudentTask(taskId: string, studentUserId: string) {
  const db = getDb();
  const [task] = await db.select().from(dailyTasks).where(eq(dailyTasks.id, taskId)).limit(1);
  if (!task) throw ApiError.notFound("Task not found");

  const qs = await db
    .select()
    .from(dailyTaskQuestions)
    .where(eq(dailyTaskQuestions.taskId, taskId))
    .orderBy(asc(dailyTaskQuestions.orderIndex));

  const questions = [];
  for (const q of qs) {
    const opts = await db
      .select()
      .from(dailyTaskOptions)
      .where(eq(dailyTaskOptions.questionId, q.id))
      .orderBy(asc(dailyTaskOptions.orderIndex));
    questions.push(shapeQuestionForStudent({ ...q, options: opts }, task.type));
  }

  const [sub] = await db
    .select()
    .from(dailyTaskSubmissions)
    .where(and(eq(dailyTaskSubmissions.taskId, taskId), eq(dailyTaskSubmissions.studentUserId, studentUserId)))
    .orderBy(desc(dailyTaskSubmissions.attemptNo))
    .limit(1);

  let result = null;
  if (sub) result = await buildResult(sub.id, studentUserId, false);

  return {
    task: {
      id: task.id,
      title: task.title,
      instructions: task.instructions,
      type: task.type,
      className: task.className,
      subjectName: task.subjectName,
      taskDate: task.taskDate,
      timeLimitMinutes: task.timeLimitMinutes,
      totalMarks: task.totalMarks,
      status: task.status,
    },
    questions,
    attempt: result
      ? { attempted: true, submission: result }
      : { attempted: false },
  };
}

async function buildResult(submissionId: string, studentUserId: string, includeAnswers: boolean) {
  const db = getDb();
  const [sub] = await db
    .select()
    .from(dailyTaskSubmissions)
    .where(eq(dailyTaskSubmissions.id, submissionId))
    .limit(1);
  if (!sub) throw ApiError.notFound("Submission not found");
  if (!includeAnswers && sub.studentUserId !== studentUserId)
    throw ApiError.forbidden("Not your submission");

  const ans = await db
    .select()
    .from(dailyTaskAnswers)
    .where(eq(dailyTaskAnswers.submissionId, submissionId));
  const qs = await db
    .select()
    .from(dailyTaskQuestions)
    .where(eq(dailyTaskQuestions.taskId, sub.taskId))
    .orderBy(asc(dailyTaskQuestions.orderIndex));
  const optsByQ = new Map<string, any[]>();
  for (const q of qs) {
    const opts = await db
      .select()
      .from(dailyTaskOptions)
      .where(eq(dailyTaskOptions.questionId, q.id))
      .orderBy(asc(dailyTaskOptions.orderIndex));
    optsByQ.set(q.id, opts);
  }
  const ansMap = new Map(ans.map((a) => [a.questionId, a]));

  const [taskRow] = await db.select({ type: dailyTasks.type }).from(dailyTasks).where(eq(dailyTasks.id, sub.taskId)).limit(1);
  const taskType = taskRow?.type ?? "mcq";

  const detail = qs.map((q) => {
    const a = ansMap.get(q.id);
    const opts = optsByQ.get(q.id) || [];
    return {
      id: q.id,
      text: q.text,
      type: taskType,
      options: opts.map((o) => ({ key: o.key, text: o.text })),
      responseText: a?.responseText ?? null,
      selectedKey: a?.selectedKey ?? null,
      isCorrect: a?.isCorrect ?? null,
      marksAwarded: a?.marksAwarded ?? null,
      explanation: q.explanation,
    };
  });

  return {
    result: {
      submissionId: sub.id,
      taskId: sub.taskId,
      attemptNo: sub.attemptNo,
      status: sub.status,
      score: sub.score,
      totalMarks: sub.totalMarks,
      percentage: sub.percentage,
      feedback: sub.feedback,
      reviewedAt: sub.reviewedAt,
      submittedAt: sub.submittedAt,
    },
    questions: detail,
  };
}

// =================== ADMIN ===================

export async function listDailyTasks(req: Request, res: Response) {
  const db = getDb();
  const { page, pageSize, q } = paginationSchema.parse(req.query);
  const type = req.query.type as string | undefined;
  const status = req.query.status as string | undefined;
  const classId = req.query.classId as string | undefined;
  const subjectId = req.query.subjectId as string | undefined;
  const date = req.query.date as string | undefined;

  const conditions = [] as any[];
  if (type) conditions.push(eq(dailyTasks.type, type as any));
  if (status) conditions.push(eq(dailyTasks.status, status as any));
  if (classId) conditions.push(eq(dailyTasks.classId, classId));
  if (subjectId) conditions.push(eq(dailyTasks.subjectId, subjectId));
  if (date) conditions.push(eq(dailyTasks.taskDate, date));
  if (q) conditions.push(sql`${dailyTasks.title} ILIKE ${"%" + q + "%"}`);

  const where = conditions.length ? and(...conditions) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(dailyTasks).where(where);
  const rows = await db
    .select({
      t: dailyTasks,
      qc: sql<number>`cast(count(${dailyTaskQuestions.id}) as int)`,
    })
    .from(dailyTasks)
    .leftJoin(dailyTaskQuestions, eq(dailyTaskQuestions.taskId, dailyTasks.id))
    .where(where)
    .groupBy(dailyTasks.id)
    .orderBy(desc(dailyTasks.taskDate), desc(dailyTasks.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  res.json({
    tasks: rows.map((r) => ({
      id: r.t.id,
      title: r.t.title,
      type: r.t.type,
      className: r.t.className,
      subjectName: r.t.subjectName,
      chapterTitle: r.t.chapterTitle,
      taskDate: r.t.taskDate,
      status: r.t.status,
      totalMarks: r.t.totalMarks,
      questionCount: r.qc,
      createdAt: r.t.createdAt,
    })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(Number(total) / pageSize)) },
  });
}

export async function getDailyTaskAdmin(req: Request, res: Response) {
  const db = getDb();
  const [task] = await db.select().from(dailyTasks).where(eq(dailyTasks.id, String(req.params.id))).limit(1);
  if (!task) throw ApiError.notFound("Task not found");
  const qs = await db
    .select()
    .from(dailyTaskQuestions)
    .where(eq(dailyTaskQuestions.taskId, task.id))
    .orderBy(asc(dailyTaskQuestions.orderIndex));
  const questions = [];
  for (const q of qs) {
    const opts = await db
      .select()
      .from(dailyTaskOptions)
      .where(eq(dailyTaskOptions.questionId, q.id))
      .orderBy(asc(dailyTaskOptions.orderIndex));
    questions.push({
      id: q.id,
      text: q.text,
      marks: q.marks,
      orderIndex: q.orderIndex,
      correctKey: q.correctKey,
      correctAnswer: q.correctAnswer,
      caseInsensitive: q.caseInsensitive,
      explanation: q.explanation,
      options: opts.map((o) => ({ key: o.key, text: o.text, isCorrect: o.isCorrect })),
    });
  }
  res.json({
    task: {
      id: task.id,
      title: task.title,
      instructions: task.instructions,
      type: task.type,
      classId: task.classId,
      className: task.className,
      subjectId: task.subjectId,
      subjectName: task.subjectName,
      chapterId: task.chapterId,
      chapterTitle: task.chapterTitle,
      taskDate: task.taskDate,
      timeLimitMinutes: task.timeLimitMinutes,
      allowReattempt: task.allowReattempt,
      status: task.status,
      totalMarks: task.totalMarks,
    },
    questions,
  });
}

export async function createDailyTask(req: Request, res: Response) {
  const data = createDailyTaskSchema.parse(req.body);
  const db = getDb();

  const [cls] = await db.select().from(classes).where(eq(classes.id, data.classId)).limit(1);
  if (!cls) throw ApiError.badRequest("Selected class does not exist");
  let subjectName: string | null = null;
  if (data.subjectId) {
    const [sub] = await db.select().from(subjects).where(eq(subjects.id, data.subjectId)).limit(1);
    subjectName = sub?.name ?? null;
  }
  let chapterTitle: string | null = null;
  if (data.chapterId) {
    const [ch] = await db.select().from(chapters).where(eq(chapters.id, data.chapterId)).limit(1);
    chapterTitle = ch?.title ?? null;
  }

  const totalMarks = data.questions.reduce((s, q) => s + (q.marks ?? 1), 0);
  const [task] = await db
    .insert(dailyTasks)
    .values({
      title: data.title.trim(),
      instructions: data.instructions || null,
      type: data.type,
      classId: data.classId,
      className: cls.name,
      subjectId: data.subjectId || null,
      subjectName,
      chapterId: data.chapterId || null,
      chapterTitle,
      taskDate: data.taskDate,
      timeLimitMinutes: data.timeLimitMinutes ?? 0,
      allowReattempt: data.allowReattempt ?? false,
      totalMarks,
      status: data.status ?? "draft",
      createdBy: (req as any).user.id,
    })
    .returning();

  await insertQuestions(task.id, data.questions, data.type);

  if (data.status === "published") {
    await notifyAllStudents({
      type: "daily_task",
      title: "New Daily Task",
      body: `${cls.name} — "${data.title}" is now available.`,
      linkUrl: `/student/daily-tasks`,
      entityId: task.id,
    });
  }

  res.status(201).json({ task: { id: task.id, status: task.status } });
}

export async function updateDailyTask(req: Request, res: Response) {
  const data = updateDailyTaskSchema.parse(req.body);
  const db = getDb();
  const [existing] = await db.select().from(dailyTasks).where(eq(dailyTasks.id, String(req.params.id))).limit(1);
  if (!existing) throw ApiError.notFound("Task not found");

  let className = existing.className;
  if (data.classId) {
    const [cls] = await db.select().from(classes).where(eq(classes.id, data.classId)).limit(1);
    if (!cls) throw ApiError.badRequest("Selected class does not exist");
    className = cls.name;
  }
  let subjectName = existing.subjectName;
  if (data.subjectId !== undefined) {
    if (data.subjectId) {
      const [sub] = await db.select().from(subjects).where(eq(subjects.id, data.subjectId)).limit(1);
      subjectName = sub?.name ?? null;
    } else subjectName = null;
  }
  let chapterTitle = existing.chapterTitle;
  if (data.chapterId !== undefined) {
    if (data.chapterId) {
      const [ch] = await db.select().from(chapters).where(eq(chapters.id, data.chapterId)).limit(1);
      chapterTitle = ch?.title ?? null;
    } else chapterTitle = null;
  }

  const totalMarks = data.questions
    ? data.questions.reduce((s, q) => s + (q.marks ?? 1), 0)
    : existing.totalMarks;

  await db
    .update(dailyTasks)
    .set({
      title: data.title?.trim() ?? existing.title,
      instructions: data.instructions ?? existing.instructions,
      type: data.type ?? existing.type,
      classId: data.classId ?? existing.classId,
      className,
      subjectId: data.subjectId !== undefined ? (data.subjectId || null) : existing.subjectId,
      subjectName,
      chapterId: data.chapterId !== undefined ? (data.chapterId || null) : existing.chapterId,
      chapterTitle,
      taskDate: data.taskDate ?? existing.taskDate,
      timeLimitMinutes: data.timeLimitMinutes ?? existing.timeLimitMinutes,
      allowReattempt: data.allowReattempt ?? existing.allowReattempt,
      totalMarks,
      status: data.status ?? existing.status,
      updatedAt: new Date(),
    })
    .where(eq(dailyTasks.id, existing.id));

  if (data.questions) {
    await db.delete(dailyTaskQuestions).where(eq(dailyTaskQuestions.taskId, existing.id));
    await insertQuestions(existing.id, data.questions, data.type ?? existing.type);
  }

  res.json({ success: true, status: data.status ?? existing.status });
}

async function insertQuestions(taskId: string, questions: any[], taskType: string) {
  const db = getDb();
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const [qrow] = await db
      .insert(dailyTaskQuestions)
      .values({
        taskId,
        text: q.text,
        marks: q.marks ?? 1,
        orderIndex: q.orderIndex ?? i,
        correctKey: q.correctKey || null,
        correctAnswer: q.correctAnswer || null,
        caseInsensitive: q.caseInsensitive ?? true,
        explanation: q.explanation || null,
      })
      .returning();

    if ((q.options && q.options.length) || taskType === "truefalse" || taskType === "mcq") {
      const opts =
        taskType === "truefalse"
          ? [
              { key: "true", text: "True", isCorrect: q.correctKey === "true" },
              { key: "false", text: "False", isCorrect: q.correctKey === "false" },
            ]
          : q.options || [];
      if (opts.length) {
        await db.insert(dailyTaskOptions).values(
          opts.map((o: any, idx: number) => ({
            questionId: qrow.id,
            key: o.key,
            text: o.text,
            isCorrect: !!o.isCorrect,
            orderIndex: idx,
          }))
        );
      }
    }
  }
}

export async function publishDailyTask(req: Request, res: Response) {
  const status = req.body?.status as "draft" | "published" | "archived" | undefined;
  if (!["draft", "published", "archived"].includes(status as string))
    throw ApiError.badRequest("Invalid status");
  const db = getDb();
  const [existing] = await db.select().from(dailyTasks).where(eq(dailyTasks.id, String(req.params.id))).limit(1);
  if (!existing) throw ApiError.notFound("Task not found");
  const wasPublished = existing.status === "published";
  await db.update(dailyTasks).set({ status, updatedAt: new Date() }).where(eq(dailyTasks.id, existing.id));
  if (status === "published" && !wasPublished) {
    await notifyAllStudents({
      type: "daily_task",
      title: "New Daily Task",
      body: `${existing.className} — "${existing.title}" is now available.`,
      linkUrl: `/student/daily-tasks`,
      entityId: existing.id,
    });
  }
  res.json({ success: true, status });
}

export async function deleteDailyTask(req: Request, res: Response) {
  const db = getDb();
  const [existing] = await db.select().from(dailyTasks).where(eq(dailyTasks.id, String(req.params.id))).limit(1);
  if (!existing) throw ApiError.notFound("Task not found");
  await db.update(dailyTasks).set({ status: "archived", updatedAt: new Date() }).where(eq(dailyTasks.id, existing.id));
  res.json({ success: true });
}

// =================== STUDENT ===================

export async function getToday(req: Request, res: Response) {
  const db = getDb();
  const cls = await resolveStudentClass((req as any).user.id);
  if (!cls) return res.json({ tasks: [] });
  const rows = await db
    .select({
      t: dailyTasks,
      qc: sql<number>`cast(count(${dailyTaskQuestions.id}) as int)`,
    })
    .from(dailyTasks)
    .leftJoin(dailyTaskQuestions, eq(dailyTaskQuestions.taskId, dailyTasks.id))
    .where(
      and(
        eq(dailyTasks.classId, cls.id),
        eq(dailyTasks.status, "published"),
        eq(dailyTasks.taskDate, sql`current_date`)
      )
    )
    .groupBy(dailyTasks.id)
    .orderBy(desc(dailyTasks.createdAt));

  const tasks = [];
  for (const r of rows) {
    const attempt = await attemptSummary((req as any).user.id, r.t.id);
    tasks.push({
      id: r.t.id,
      title: r.t.title,
      type: r.t.type,
      className: r.t.className,
      subjectName: r.t.subjectName,
      taskDate: r.t.taskDate,
      totalMarks: r.t.totalMarks,
      questionCount: r.qc,
      attempt,
    });
  }
  res.json({ tasks });
}

export async function getHistory(req: Request, res: Response) {
  const db = getDb();
  const cls = await resolveStudentClass((req as any).user.id);
  if (!cls) return res.json({ tasks: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } });
  const { page, pageSize } = paginationSchema.parse(req.query);
  const rows = await db
    .select({
      t: dailyTasks,
      qc: sql<number>`cast(count(${dailyTaskQuestions.id}) as int)`,
    })
    .from(dailyTasks)
    .leftJoin(dailyTaskQuestions, eq(dailyTaskQuestions.taskId, dailyTasks.id))
    .where(
      and(
        eq(dailyTasks.classId, cls.id),
        eq(dailyTasks.status, "published"),
        sql`${dailyTasks.taskDate} <= current_date`
      )
    )
    .groupBy(dailyTasks.id)
    .orderBy(desc(dailyTasks.taskDate), desc(dailyTasks.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const tasks = [];
  for (const r of rows) {
    const attempt = await attemptSummary((req as any).user.id, r.t.id);
    tasks.push({
      id: r.t.id,
      title: r.t.title,
      type: r.t.type,
      className: r.t.className,
      subjectName: r.t.subjectName,
      taskDate: r.t.taskDate,
      totalMarks: r.t.totalMarks,
      questionCount: r.qc,
      attempt,
    });
  }
  const [{ total }] = await db
    .select({ total: count() })
    .from(dailyTasks)
    .where(
      and(
        eq(dailyTasks.classId, cls.id),
        eq(dailyTasks.status, "published"),
        sql`${dailyTasks.taskDate} <= current_date`
      )
    );
  res.json({ tasks, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(Number(total) / pageSize)) } });
}

async function attemptSummary(studentUserId: string, taskId: string) {
  const db = getDb();
  const rows = await db
    .select({ status: dailyTaskSubmissions.status, attemptNo: dailyTaskSubmissions.attemptNo })
    .from(dailyTaskSubmissions)
    .where(and(eq(dailyTaskSubmissions.taskId, taskId), eq(dailyTaskSubmissions.studentUserId, studentUserId)));
  const submitted = rows.filter((r) => r.status !== null);
  const latest = rows.sort((a, b) => (b.attemptNo ?? 0) - (a.attemptNo ?? 0))[0];
  const evaluated = rows.find((r) => r.status === "evaluated" || r.status === "pending_review");
  return {
    attempted: rows.length > 0,
    attemptsUsed: rows.length,
    status: latest?.status ?? null,
    evaluated: !!evaluated,
  };
}

export async function getStudentTaskDetail(req: Request, res: Response) {
  const studentUserId = (req as any).user.id;
  const cls = await resolveStudentClass(studentUserId);
  const data = await buildStudentTask(String(req.params.id), studentUserId);
  // Security: students may only open tasks for their own class.
  if (cls) {
    const [task] = await getDb().select({ classId: dailyTasks.classId }).from(dailyTasks).where(eq(dailyTasks.id, String(req.params.id))).limit(1);
    if (!task || task.classId !== cls.id) throw ApiError.forbidden("This task is not available to your class");
  }
  res.json(data);
}

export async function submitDailyTask(req: Request, res: Response) {
  const studentUserId = (req as any).user.id;
  const { answers } = dailySubmitSchema.parse(req.body);
  const db = getDb();

  const [task] = await db.select().from(dailyTasks).where(eq(dailyTasks.id, String(req.params.id))).limit(1);
  if (!task) throw ApiError.notFound("Task not found");
  if (task.status !== "published") throw ApiError.forbidden("This task is not available");

  const cls = await resolveStudentClass(studentUserId);
  if (!cls || task.classId !== cls.id) throw ApiError.forbidden("This task is not for your class");

  const existing = await db
    .select()
    .from(dailyTaskSubmissions)
    .where(and(eq(dailyTaskSubmissions.taskId, task.id), eq(dailyTaskSubmissions.studentUserId, studentUserId)))
    .orderBy(desc(dailyTaskSubmissions.attemptNo))
    .limit(1);
  if (existing.length > 0 && !task.allowReattempt)
    throw ApiError.badRequest("You have already submitted this task");
  const attemptNo = existing.length + 1;

  const qs = await db.select().from(dailyTaskQuestions).where(eq(dailyTaskQuestions.taskId, task.id));
  const optsByQ = new Map<string, any[]>();
  for (const q of qs) {
    const opts = await db.select().from(dailyTaskOptions).where(eq(dailyTaskOptions.questionId, q.id));
    optsByQ.set(q.id, opts);
  }

  const answerRows: any[] = [];
  let score = 0;
  let total = 0;
  let hasPending = false;

  for (const q of qs) {
    total += q.marks;
    const a = answers.find((x) => x.questionId === q.id);
    const opts = optsByQ.get(q.id) || [];
    let isCorrect: boolean | null = null;
    let marksAwarded: number | null = null;
    let selectedKey: string | null = null;
    let responseText: string | null = null;
    let auto = false;

    if (task.type === "mcq" || task.type === "truefalse") {
      selectedKey = a?.selectedKey ?? null;
      const correctOpt = opts.find((o) => o.isCorrect);
      isCorrect = selectedKey != null && correctOpt != null && selectedKey === correctOpt.key;
      marksAwarded = isCorrect ? q.marks : 0;
      auto = true;
      if (isCorrect) score += q.marks;
    } else if (task.type === "oneword") {
      responseText = (a?.responseText ?? "").trim();
      const expected = (q.correctAnswer ?? "").trim();
      const match = q.caseInsensitive
        ? responseText.toLowerCase() === expected.toLowerCase()
        : responseText === expected;
      isCorrect = match;
      marksAwarded = match ? q.marks : 0;
      auto = true;
      if (match) score += q.marks;
    } else {
      // short / qa -> manual review
      responseText = a?.responseText ?? null;
      isCorrect = null;
      marksAwarded = null;
      auto = false;
      hasPending = true;
    }

    answerRows.push({
      questionId: q.id,
      selectedKey,
      responseText,
      isCorrect,
      autoEvaluated: auto,
      marksAwarded,
    });
  }

  const status = hasPending ? "pending_review" : "evaluated";
  const percentage = !hasPending && total > 0 ? Math.round((score / total) * 1000) / 10 : null;

  const [sub] = await db
    .insert(dailyTaskSubmissions)
    .values({
      taskId: task.id,
      studentUserId,
      attemptNo,
      status,
      score: hasPending ? score : score,
      totalMarks: total,
      percentage,
    })
    .returning();

  await db.insert(dailyTaskAnswers).values(answerRows.map((r) => ({ ...r, submissionId: sub.id })));

  await notifyResult(studentUserId, task, status, percentage);

  res.json(await buildResult(sub.id, studentUserId, false));
}

async function notifyResult(studentUserId: string, task: any, status: string, percentage: number | null) {
  const db = getDb();
  let body = `You scored ${percentage ?? "—"}% on "${task.title}".`;
  if (status === "pending_review") body = `Your answers for "${task.title}" were submitted and are pending review.`;
  await db.insert(notifications).values({
    userId: studentUserId,
    type: "daily_task_result",
    title: `Task result: ${task.title}`,
    body,
    linkUrl: `/student/daily-tasks`,
    entityId: task.id,
  });
}

// =================== RESULTS / REVIEW ===================

export async function getSubmissionDetail(req: Request, res: Response) {
  const data = await buildResult(String(req.params.submissionId), "", true);
  res.json(data);
}

export async function getSubmissions(req: Request, res: Response) {
  const db = getDb();
  const taskId = String(req.params.id);
  const rows = await db
    .select({
      s: dailyTaskSubmissions,
      name: users.name,
      email: users.email,
    })
    .from(dailyTaskSubmissions)
    .innerJoin(users, eq(dailyTaskSubmissions.studentUserId, users.id))
    .where(eq(dailyTaskSubmissions.taskId, taskId))
    .orderBy(desc(dailyTaskSubmissions.submittedAt));

  const result = [];
  for (const r of rows) {
    const [stu] = await db
      .select({ className: students.className })
      .from(students)
      .where(eq(students.userId, r.s.studentUserId))
      .limit(1);
    result.push({
      submissionId: r.s.id,
      studentName: r.name,
      studentEmail: r.email,
      className: stu?.className ?? null,
      status: r.s.status,
      score: r.s.score,
      totalMarks: r.s.totalMarks,
      percentage: r.s.percentage,
      feedback: r.s.feedback,
      submittedAt: r.s.submittedAt,
      attemptNo: r.s.attemptNo,
    });
  }
  res.json({ submissions: result });
}

export async function reviewSubmission(req: Request, res: Response) {
  const db = getDb();
  const data = dailyReviewSchema.parse(req.body);
  const submissionId = String(req.params.submissionId);
  const [sub] = await db.select().from(dailyTaskSubmissions).where(eq(dailyTaskSubmissions.id, submissionId)).limit(1);
  if (!sub) throw ApiError.notFound("Submission not found");

  if (data.answers && data.answers.length) {
    for (const a of data.answers) {
      await db
        .update(dailyTaskAnswers)
        .set({
          marksAwarded: a.marksAwarded ?? null,
          isCorrect: a.isCorrect ?? null,
        })
        .where(
          and(
            eq(dailyTaskAnswers.submissionId, submissionId),
            eq(dailyTaskAnswers.questionId, a.questionId)
          )
        );
    }
  }

  const ans = await db
    .select({ marks: dailyTaskAnswers.marksAwarded })
    .from(dailyTaskAnswers)
    .where(eq(dailyTaskAnswers.submissionId, submissionId));
  const total = sub.totalMarks || ans.length;
  const awarded = ans.reduce((s, a) => s + (a.marks ?? 0), 0);
  const percentage = total > 0 ? Math.round((awarded / total) * 1000) / 10 : null;
  const status = data.status ?? "evaluated";

  await db
    .update(dailyTaskSubmissions)
    .set({
      score: awarded,
      totalMarks: total,
      percentage,
      status,
      feedback: data.feedback || null,
      reviewedBy: (req as any).user.id,
      reviewedAt: new Date(),
    })
    .where(eq(dailyTaskSubmissions.id, submissionId));

  res.json(await buildResult(submissionId, sub.studentUserId, true));
}
