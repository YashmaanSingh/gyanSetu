import { and, eq, isNull, sql, desc, gte, lte, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  users,
  students,
  materials,
  materialCompletions,
  materialViews,
  quizAttempts,
  activities,
  courses,
} from "../db/schema";

export interface StudentProgress {
  studentId: string;
  courseId: string | null;
  batch: string | null;
  notesCompleted: number;
  booksOpened: number;
  materialsCompleted: number;
  totalPublishedMaterials: number;
  totalPublishedNotes: number;
  totalPublishedBooks: number;
  quizAttempts: number;
  avgPercentage: number;
  passedCount: number;
  failedCount: number;
  dailyStreak: number;
  activityCompletionRate: number;
  completedActivities: number;
  totalActivities: number;
  lastActivityDate: string | null;
}

const visibilityCond = (courseId: string | null, batch: string | null) =>
  sql`(${materials.visibility} = 'all' OR (${materials.visibility} = 'course' AND ${materials.courseId} = ${courseId ?? null}) OR (${materials.visibility} = 'batch' AND ${materials.batch} = ${batch ?? ""}))`;

export async function computeStudentProgress(userId: string): Promise<StudentProgress> {
  const db = getDb();
  const [stu] = await db
    .select({ courseId: students.courseId, batch: students.batch })
    .from(students)
    .where(eq(students.userId, userId))
    .limit(1);

  const courseId = stu?.courseId ?? null;
  const batch = stu?.batch ?? null;

  // Published material totals (visible to this student)
  const [totals] = await db
    .select({
      total: sql<number>`cast(count(*) filter (where ${materials.status} = 'published') as int)`,
      notes: sql<number>`cast(count(*) filter (where ${materials.status} = 'published' and ${materials.type} = 'note') as int)`,
      books: sql<number>`cast(count(*) filter (where ${materials.status} = 'published' and ${materials.type} = 'book') as int)`,
    })
    .from(materials)
    .where(and(isNull(materials.deletedAt), visibilityCond(courseId, batch)));

  const [comp] = await db
    .select({
      all: sql<number>`cast(count(*) as int)`,
      notes: sql<number>`cast(count(*) filter (where ${materials.type} = 'note') as int)`,
    })
    .from(materialCompletions)
    .innerJoin(materials, eq(materialCompletions.materialId, materials.id))
    .where(eq(materialCompletions.studentUserId, userId));

  const [views] = await db
    .select({
      books: sql<number>`cast(count(*) filter (where ${materials.type} = 'book') as int)`,
    })
    .from(materialViews)
    .innerJoin(materials, eq(materialViews.materialId, materials.id))
    .where(eq(materialViews.studentUserId, userId));

  const [quiz] = await db
    .select({
      attempts: sql<number>`cast(count(*) as int)`,
      avg: sql<number>`coalesce(avg(${quizAttempts.percentage}), 0)`,
      passed: sql<number>`cast(count(*) filter (where ${quizAttempts.passed} = true) as int)`,
      failed: sql<number>`cast(count(*) filter (where ${quizAttempts.passed} = false) as int)`,
    })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.studentUserId, userId), eq(quizAttempts.status, "submitted")));

  // Activity completion (submitted attempts for published past activities)
  const [act] = await db
    .select({
      total: sql<number>`cast(count(*) as int)`,
    })
    .from(activities)
    .where(
      and(
        isNull(activities.deletedAt),
        eq(activities.status, "published"),
        lte(activities.activityDate, sql`current_date`)
      )
    );

  const submittedActivityIds = db
    .selectDistinct({ id: quizAttempts.activityId })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.studentUserId, userId), eq(quizAttempts.status, "submitted")));

  const [done] = await db
    .select({ completed: sql<number>`cast(count(*) as int)` })
    .from(activities)
    .where(
      and(
        isNull(activities.deletedAt),
        eq(activities.status, "published"),
        lte(activities.activityDate, sql`current_date`),
        inArray(activities.id, submittedActivityIds)
      )
    );

  const totalActivities = Number(act?.total ?? 0);
  const completedActivities = Number(done?.completed ?? 0);
  const activityCompletionRate = totalActivities ? (completedActivities / totalActivities) * 100 : 0;

  const dailyStreak = await computeStreak(userId);

  return {
    studentId: userId,
    courseId,
    batch,
    notesCompleted: Number(comp?.notes ?? 0),
    booksOpened: Number(views?.books ?? 0),
    materialsCompleted: Number(comp?.all ?? 0),
    totalPublishedMaterials: Number(totals?.total ?? 0),
    totalPublishedNotes: Number(totals?.notes ?? 0),
    totalPublishedBooks: Number(totals?.books ?? 0),
    quizAttempts: Number(quiz?.attempts ?? 0),
    avgPercentage: Number(quiz?.avg ?? 0),
    passedCount: Number(quiz?.passed ?? 0),
    failedCount: Number(quiz?.failed ?? 0),
    dailyStreak,
    activityCompletionRate: Math.round(activityCompletionRate * 10) / 10,
    completedActivities,
    totalActivities,
    lastActivityDate: null,
  };
}

async function computeStreak(userId: string): Promise<number> {
  const db = getDb();
  const dates = new Set<string>();
  const add = (rows: { d: string | null }[]) => {
    for (const r of rows) if (r.d) dates.add(r.d);
  };
  add(
    await db
      .select({ d: sql<string>`cast(${materialCompletions.completedAt} as date)` })
      .from(materialCompletions)
      .where(eq(materialCompletions.studentUserId, userId))
  );
  add(
    await db
      .select({ d: sql<string>`cast(${materialViews.viewedAt} as date)` })
      .from(materialViews)
      .where(eq(materialViews.studentUserId, userId))
  );
  add(
    await db
      .select({ d: sql<string>`cast(${quizAttempts.submittedAt} as date)` })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.studentUserId, userId), eq(quizAttempts.status, "submitted")))
  );

  if (dates.size === 0) return 0;
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  // Allow streak to count from today or yesterday
  let cursor = new Date(today);
  if (!dates.has(fmt(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!dates.has(fmt(cursor))) return 0;
  }
  let streak = 0;
  while (dates.has(fmt(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalMaterials: number;
  totalNotes: number;
  totalBooks: number;
  totalPublishedMaterials: number;
  todaysActivities: number;
  quizAttempts: number;
  avgScore: number;
  attemptsLast14: { date: string; attempts: number; avg: number }[];
  engagementLast6: { month: string; students: number }[];
  completionLast7: { date: string; completed: number; total: number }[];
}

export async function computeDashboardStats(): Promise<DashboardStats> {
  const db = getDb();
  const [studentsAgg] = await db
    .select({
      total: sql<number>`cast(count(*) as int)`,
      active: sql<number>`cast(count(*) filter (where ${users.status} = 'active') as int)`,
    })
    .from(users)
    .where(and(eq(users.role, "student"), isNull(users.deletedAt)));

  const [matAgg] = await db
    .select({
      total: sql<number>`cast(count(*) as int)`,
      published: sql<number>`cast(count(*) filter (where ${materials.status} = 'published') as int)`,
      notes: sql<number>`cast(count(*) filter (where ${materials.type} = 'note') as int)`,
      books: sql<number>`cast(count(*) filter (where ${materials.type} = 'book') as int)`,
    })
    .from(materials)
    .where(isNull(materials.deletedAt));

  const [actAgg] = await db
    .select({ today: sql<number>`cast(count(*) as int)` })
    .from(activities)
    .where(
      and(
        isNull(activities.deletedAt),
        eq(activities.status, "published"),
        eq(activities.activityDate, sql`current_date`)
      )
    );

  const [quizAgg] = await db
    .select({
      attempts: sql<number>`cast(count(*) as int)`,
      avg: sql<number>`coalesce(avg(${quizAttempts.percentage}), 0)`,
    })
    .from(quizAttempts)
    .where(eq(quizAttempts.status, "submitted"));

  const attemptsLast14 = await db
    .select({
      date: sql<string>`cast(${quizAttempts.submittedAt} as date)`,
      attempts: sql<number>`cast(count(*) as int)`,
      avg: sql<number>`coalesce(round(avg(${quizAttempts.percentage})::numeric,1),0)`,
    })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.status, "submitted"),
        gte(quizAttempts.submittedAt, sql`current_date - interval '13 days'`)
      )
    )
    .groupBy(sql`cast(${quizAttempts.submittedAt} as date)`);

  const engagementLast6 = await db
    .select({
      month: sql<string>`to_char(${quizAttempts.submittedAt}, 'YYYY-MM')`,
      students: sql<number>`cast(count(distinct ${quizAttempts.studentUserId}) as int)`,
    })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.status, "submitted"),
        gte(quizAttempts.submittedAt, sql`current_date - interval '6 months'`)
      )
    )
    .groupBy(sql`to_char(${quizAttempts.submittedAt}, 'YYYY-MM')`);

  const completionLast7 = await db
    .select({
      date: sql<string>`cast(${activities.activityDate} as date)`,
      total: sql<number>`cast(count(*) as int)`,
    })
    .from(activities)
    .where(
      and(
        isNull(activities.deletedAt),
        eq(activities.status, "published"),
        gte(activities.activityDate, sql`current_date - interval '6 days'`)
      )
    )
    .groupBy(sql`cast(${activities.activityDate} as date)`);

  const completionByDate = new Map<string, number>(
    completionLast7.map((c) => [String(c.date), Number(c.total)])
  );
  const completedByDate = new Map<string, number>();
  const completedRows = await db
    .select({
      date: sql<string>`cast(${activities.activityDate} as date)`,
      c: sql<number>`cast(count(distinct ${quizAttempts.activityId}) as int)`,
    })
    .from(quizAttempts)
    .innerJoin(activities, eq(quizAttempts.activityId, activities.id))
    .where(
      and(
        eq(quizAttempts.status, "submitted"),
        gte(activities.activityDate, sql`current_date - interval '6 days'`)
      )
    )
    .groupBy(sql`cast(${activities.activityDate} as date)`);
  for (const r of completedRows) completedByDate.set(String(r.date), Number(r.c));

  const completionSeries = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      date: key,
      total: completionByDate.get(key) ?? 0,
      completed: completedByDate.get(key) ?? 0,
    };
  });

  return {
    totalStudents: Number(studentsAgg?.total ?? 0),
    activeStudents: Number(studentsAgg?.active ?? 0),
    totalMaterials: Number(matAgg?.total ?? 0),
    totalNotes: Number(matAgg?.notes ?? 0),
    totalBooks: Number(matAgg?.books ?? 0),
    totalPublishedMaterials: Number(matAgg?.published ?? 0),
    todaysActivities: Number(actAgg?.today ?? 0),
    quizAttempts: Number(quizAgg?.attempts ?? 0),
    avgScore: Math.round(Number(quizAgg?.avg ?? 0) * 10) / 10,
    attemptsLast14: attemptsLast14.map((a) => ({
      date: String(a.date),
      attempts: Number(a.attempts),
      avg: Number(a.avg),
    })),
    engagementLast6: engagementLast6.map((e) => ({ month: String(e.month), students: Number(e.students) })),
    completionLast7: completionSeries,
  };
}
