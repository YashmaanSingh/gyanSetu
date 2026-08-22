import { Request, Response } from "express";
import { and, desc, eq, isNull, ilike, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  users,
  students,
  courses,
  materials,
  activities,
  questions,
  announcements,
  subjects,
  files,
} from "../db/schema";

export async function search(req: Request, res: Response) {
  const q = String(req.query.q || "").trim();
  if (!q || q.length < 2) return res.json({ materials: [], activities: [], announcements: [], students: [] });
  const isAdmin = (req as any).user.role === "admin";
  const db = getDb();
  const likeQ = `%${q}%`;

  // Materials
  const matCond = isAdmin
    ? and(isNull(materials.deletedAt), or(ilike(materials.title, likeQ), ilike(materials.description, likeQ)) as any)
    : and(
        isNull(materials.deletedAt),
        eq(materials.status, "published"),
        or(ilike(materials.title, likeQ), ilike(materials.description, likeQ)) as any
      );
  const mats = await db
    .select({ id: materials.id, title: materials.title, type: materials.type, description: materials.description })
    .from(materials)
    .where(matCond)
    .limit(8);

  // Activities
  const actCond = isAdmin
    ? and(isNull(activities.deletedAt), ilike(activities.title, likeQ))
    : and(isNull(activities.deletedAt), eq(activities.status, "published"), ilike(activities.title, likeQ));
  const acts = await db
    .select({ id: activities.id, title: activities.title, type: activities.type, activityDate: activities.activityDate })
    .from(activities)
    .where(actCond)
    .limit(8);

  // Announcements
  const annCond = isAdmin
    ? and(isNull(announcements.deletedAt), or(ilike(announcements.title, likeQ), ilike(announcements.message, likeQ)) as any)
    : and(
        isNull(announcements.deletedAt),
        sql`${announcements.targetRole} in ('all','students')`,
        sql`${announcements.publishDate} <= now()`,
        or(ilike(announcements.title, likeQ), ilike(announcements.message, likeQ)) as any
      );
  const anns = await db
    .select({ id: announcements.id, title: announcements.title, priority: announcements.priority })
    .from(announcements)
    .where(annCond)
    .limit(8);

  let stus: any[] = [];
  if (isAdmin) {
    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email, studentCode: students.studentCode, courseName: courses.name })
      .from(users)
      .leftJoin(students, eq(students.userId, users.id))
      .leftJoin(courses, eq(students.courseId, courses.id))
      .where(
        and(
          eq(users.role, "student"),
          isNull(users.deletedAt),
          or(ilike(users.name, likeQ), ilike(users.email, likeQ), sql`exists (select 1 from ${students} s where s.user_id=${users.id} and s.student_code ilike ${likeQ})`) as any
        )
      )
      .limit(8);
    stus = rows;
  }

  res.json({
    materials: mats,
    activities: acts,
    announcements: anns,
    students: stus,
  });
}
