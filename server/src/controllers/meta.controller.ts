import { Request, Response } from "express";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../db";
import { subjects, courses } from "../db/schema";

export async function listSubjects(req: Request, res: Response) {
  const rows = await getDb().select().from(subjects).orderBy(subjects.name);
  res.json({ subjects: rows });
}

export async function listCourses(req: Request, res: Response) {
  const rows = await getDb().select().from(courses).orderBy(courses.name);
  res.json({ courses: rows });
}

export async function createSubject(req: Request, res: Response) {
  const db = getDb();
  const name = String(req.body?.name || "").trim();
  const courseId = req.body?.courseId || null;
  if (!name) throw new Error("Name required");
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const [row] = await db
    .insert(subjects)
    .values({ name, slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`, courseId })
    .returning();
  res.status(201).json({ subject: row });
}

export async function createCourse(req: Request, res: Response) {
  const db = getDb();
  const name = String(req.body?.name || "").trim();
  const code = String(req.body?.code || "").trim().toUpperCase() || `CRS-${Date.now().toString().slice(-6)}`;
  if (!name) throw new Error("Name required");
  const [row] = await db.insert(courses).values({ name, code }).returning();
  res.status(201).json({ course: row });
}
