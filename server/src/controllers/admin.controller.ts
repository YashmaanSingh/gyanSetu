import { Request, Response } from "express";
import { and, desc, eq, isNull, sql, count, gte } from "drizzle-orm";
import { getDb } from "../db";
import {
  users,
  students,
  courses,
  materials,
  activities,
  questions,
  quizAttempts,
  materialCompletions,
  materialViews,
  settings,
} from "../db/schema";
import { ApiError } from "../utils/errors";
import { settingsSchema } from "../validators";
import { computeDashboardStats, computeStudentProgress } from "../utils/analytics";
import { getPlatformSettings, getSettingsValue } from "../utils/helpers";
import { toCsv } from "../utils/csv";

export async function dashboard(req: Request, res: Response) {
  const stats = await computeDashboardStats();
  const platform = await getPlatformSettings();
  res.json({ stats, platform });
}

export async function reportStudents(req: Request, res: Response) {
  const db = getDb();
  const rows = await db
    .select({ u: users, s: students, c: courses })
    .from(users)
    .leftJoin(students, eq(students.userId, users.id))
    .leftJoin(courses, eq(students.courseId, courses.id))
    .where(and(eq(users.role, "student"), isNull(users.deletedAt)))
    .orderBy(users.name);
  const data = [];
  for (const r of rows) {
    const p = await computeStudentProgress(r.u.id);
    data.push({
      studentCode: r.s?.studentCode ?? "",
      name: r.u.name,
      email: r.u.email,
      course: r.c?.name ?? "",
      batch: r.s?.batch ?? "",
      status: r.u.status,
      quizAttempts: p.quizAttempts,
      avgPercentage: p.avgPercentage,
      notesCompleted: p.notesCompleted,
      materialsCompleted: p.materialsCompleted,
      dailyStreak: p.dailyStreak,
      activityCompletionRate: p.activityCompletionRate,
    });
  }
  if (req.query.format === "csv") {
    return sendCsv(res, "students-performance.csv", data);
  }
  res.json({ students: data });
}

export async function reportQuizzes(req: Request, res: Response) {
  const db = getDb();
  const acts = await db
    .select({ a: activities, qc: sql<number>`cast(count(${questions.id}) as int)` })
    .from(activities)
    .leftJoin(questions, eq(questions.activityId, activities.id))
    .where(and(isNull(activities.deletedAt), eq(activities.status, "published")))
    .groupBy(activities.id)
    .orderBy(desc(activities.activityDate));
  const data = [];
  for (const r of acts) {
    const [agg] = await db
      .select({
        attempts: sql<number>`cast(count(*) as int)`,
        avg: sql<number>`coalesce(avg(${quizAttempts.percentage}),0)`,
        passed: sql<number>`cast(count(*) filter (where ${quizAttempts.passed}=true) as int)`,
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.activityId, r.a.id));
    const attempts = Number(agg?.attempts ?? 0);
    const avg = Number(agg?.avg ?? 0);
    const passed = Number(agg?.passed ?? 0);
    data.push({
      title: r.a.title,
      type: r.a.type,
      date: r.a.activityDate,
      questions: Number(r.qc),
      totalMarks: r.a.totalMarks,
      attempts,
      avgPercentage: Math.round(avg * 10) / 10,
      passRate: attempts ? Math.round((passed / attempts) * 100) : 0,
    });
  }
  if (req.query.format === "csv") {
    return sendCsv(res, "quiz-performance.csv", data);
  }
  res.json({ quizzes: data });
}

export async function reportMaterials(req: Request, res: Response) {
  const db = getDb();
  const mats = await db
    .select({
      m: materials,
      views: sql<number>`cast(count(distinct ${materialViews.studentUserId}) as int)`,
      completions: sql<number>`cast(count(*) as int)`,
    })
    .from(materials)
    .leftJoin(materialViews, eq(materialViews.materialId, materials.id))
    .leftJoin(materialCompletions, eq(materialCompletions.materialId, materials.id))
    .where(isNull(materials.deletedAt))
    .groupBy(materials.id);
  const data = mats.map((r) => ({
    title: r.m.title,
    type: r.m.type,
    status: r.m.status,
    views: Number(r.views),
    completions: Number(r.completions),
  }));
  if (req.query.format === "csv") {
    return sendCsv(res, "material-usage.csv", data);
  }
  res.json({ materials: data });
}

function sendCsv(res: Response, filename: string, rows: Record<string, unknown>[]) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(toCsv(rows));
}

export async function getSettings(req: Request, res: Response) {
  res.json({ settings: await getPlatformSettings() });
}

export async function updateSettings(req: Request, res: Response) {
  const data = settingsSchema.parse(req.body);
  const db = getDb();
  if (data.platformName !== undefined || data.platformTagline !== undefined || data.logoFileId !== undefined || data.themeColor !== undefined) {
    const cur = await getSettingsValue<any>("platform", {});
    await db.insert(settings).values({ key: "platform", value: { ...cur, platformName: data.platformName ?? cur.platformName, platformTagline: data.platformTagline ?? cur.platformTagline, logoFileId: data.logoFileId ?? cur.logoFileId, themeColor: data.themeColor ?? cur.themeColor } }).onConflictDoUpdate({ target: settings.key, set: { value: { ...cur, platformName: data.platformName ?? cur.platformName, platformTagline: data.platformTagline ?? cur.platformTagline, logoFileId: data.logoFileId ?? cur.logoFileId, themeColor: data.themeColor ?? cur.themeColor }, updatedAt: new Date() } });
  }
  if (data.quiz) {
    const cur = await getSettingsValue<any>("quiz", {});
    await db.insert(settings).values({ key: "quiz", value: { ...cur, ...data.quiz } }).onConflictDoUpdate({ target: settings.key, set: { value: { ...cur, ...data.quiz }, updatedAt: new Date() } });
  }
  if (data.notificationsEnabled !== undefined) {
    const cur = await getSettingsValue<any>("notifications", {});
    await db.insert(settings).values({ key: "notifications", value: { ...cur, notificationsEnabled: data.notificationsEnabled } }).onConflictDoUpdate({ target: settings.key, set: { value: { ...cur, notificationsEnabled: data.notificationsEnabled }, updatedAt: new Date() } });
  }
  if (data.uploads) {
    const cur = await getSettingsValue<any>("uploads", {});
    await db.insert(settings).values({ key: "uploads", value: { ...cur, ...data.uploads } }).onConflictDoUpdate({ target: settings.key, set: { value: { ...cur, ...data.uploads }, updatedAt: new Date() } });
  }
  res.json({ settings: await getPlatformSettings() });
}
