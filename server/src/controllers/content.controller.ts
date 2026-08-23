import type { Request, Response } from "express";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  classes,
  subjects,
  classSubjects,
  chapters,
  chapterContent,
  studyMaterials,
} from "../db/schema";
import { fileStorage } from "../utils/storage";
import { fileUrl } from "../utils/helpers";
import { ApiError } from "../utils/errors";

function obj(json: unknown) {
  return json as any;
}

async function serializeChapter(chapterId: string) {
  const db = getDb();
  const ch = await db.query.chapters.findFirst({ where: eq(chapters.id, chapterId) });
  if (!ch) return null;
  const content = await db.query.chapterContent.findFirst({
    where: eq(chapterContent.chapterId, chapterId),
  });
  const mats = await db.query.studyMaterials.findMany({
    where: eq(studyMaterials.chapterId, chapterId),
    orderBy: asc(studyMaterials.createdAt),
  });
  return {
    ...ch,
    content: content
      ? {
          intro: content.intro,
          objectives: obj(content.objectives),
          keyPoints: obj(content.keyPoints),
          definitions: obj(content.definitions),
          examples: obj(content.examples),
          practiceQuestions: obj(content.practiceQuestions),
          revision: content.revision,
          body: content.body,
        }
      : null,
    studyMaterials: mats.map((m) => ({
      ...m,
      fileUrl: m.fileId ? fileUrl(m.fileId) : null,
    })),
  };
}

export async function listClasses(_req: Request, res: Response) {
  const db = getDb();
  const rows = await db
    .select()
    .from(classes)
    .where(eq(classes.status, "active"))
    .orderBy(asc(classes.orderIndex));
  res.json({ classes: rows });
}

export async function createClass(req: Request, res: Response) {
  const db = getDb();
  const { name, slug, description, orderIndex } = req.body as any;
  if (!name) throw ApiError.badRequest("name required");
  const s = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const [row] = await db
    .insert(classes)
    .values({ name, slug: s, description, orderIndex: orderIndex ?? 0 })
    .returning();
  res.status(201).json({ class: row });
}

export async function updateClass(req: Request, res: Response) {
  const db = getDb();
  const id = String(req.params.id);
  const [row] = await db
    .update(classes)
    .set({ ...(req.body as any), updatedAt: new Date() })
    .where(eq(classes.id, id))
    .returning();
  res.json({ class: row });
}

export async function archiveClass(req: Request, res: Response) {
  const db = getDb();
  await db
    .update(classes)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(classes.id, String(req.params.id)));
  res.json({ ok: true });
}

export async function listSubjects(_req: Request, res: Response) {
  const db = getDb();
  const rows = await db.select().from(subjects).orderBy(asc(subjects.name));
  res.json({ subjects: rows });
}

export async function createSubject(req: Request, res: Response) {
  const db = getDb();
  const { name, slug, description } = req.body as any;
  if (!name) throw ApiError.badRequest("name required");
  const s = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const [row] = await db
    .insert(subjects)
    .values({ name, slug: s })
    .returning();
  res.status(201).json({ subject: row });
}

export async function updateSubject(req: Request, res: Response) {
  const db = getDb();
  const id = String(req.params.id);
  const [row] = await db.update(subjects).set(req.body as any).where(eq(subjects.id, id)).returning();
  res.json({ subject: row });
}

export async function deleteSubject(req: Request, res: Response) {
  const db = getDb();
  await db.delete(subjects).where(eq(subjects.id, String(req.params.id)));
  res.json({ ok: true });
}

export async function getClassSubjects(req: Request, res: Response) {
  const db = getDb();
  const classId = String(req.params.classId);
  const rows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      slug: subjects.slug,
      classSubjectId: classSubjects.id,
      orderIndex: classSubjects.orderIndex,
    })
    .from(classSubjects)
    .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
    .where(eq(classSubjects.classId, classId))
    .orderBy(asc(classSubjects.orderIndex));
  res.json({ subjects: rows });
}

export async function addClassSubject(req: Request, res: Response) {
  const db = getDb();
  const { classId, subjectId, orderIndex } = req.body as any;
  if (!classId || !subjectId) throw ApiError.badRequest("classId and subjectId required");
  const [row] = await db
    .insert(classSubjects)
    .values({ classId, subjectId, orderIndex: orderIndex ?? 0 })
    .onConflictDoNothing()
    .returning();
  res.status(201).json({ classSubject: row });
}

export async function removeClassSubject(req: Request, res: Response) {
  const db = getDb();
  await db.delete(classSubjects).where(eq(classSubjects.id, String(req.params.id)));
  res.json({ ok: true });
}

export async function getSubjectChapters(req: Request, res: Response) {
  const db = getDb();
  const classId = String(req.params.classId);
  const subjectId = String(req.params.subjectId);
  const rows = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.classId, classId), eq(chapters.subjectId, subjectId)))
    .orderBy(asc(chapters.chapterNo));
  res.json({ chapters: rows });
}

export async function createChapter(req: Request, res: Response) {
  const db = getDb();
  const { classId, subjectId, chapterNo, title, summary } = req.body as any;
  if (!classId || !subjectId || !title)
    throw ApiError.badRequest("classId, subjectId and title required");
  const [row] = await db
    .insert(chapters)
    .values({
      classId,
      subjectId,
      chapterNo: chapterNo ?? 1,
      title,
      summary,
      status: "published",
    })
    .returning();
  res.status(201).json({ chapter: row });
}

export async function updateChapter(req: Request, res: Response) {
  const db = getDb();
  const id = String(req.params.id);
  const [row] = await db
    .update(chapters)
    .set({ ...(req.body as any), updatedAt: new Date() })
    .where(eq(chapters.id, id))
    .returning();
  res.json({ chapter: row });
}

export async function deleteChapter(req: Request, res: Response) {
  const db = getDb();
  await db.delete(chapters).where(eq(chapters.id, String(req.params.id)));
  res.json({ ok: true });
}

export async function getChapter(req: Request, res: Response) {
  const ch = await serializeChapter(String(req.params.id));
  if (!ch) throw ApiError.notFound("chapter not found");
  res.json({ chapter: ch });
}

export async function upsertChapterContent(req: Request, res: Response) {
  const db = getDb();
  const chapterId = String(req.params.id);
  const existing = await db.query.chapterContent.findFirst({
    where: eq(chapterContent.chapterId, chapterId),
  });
  if (existing) {
    const [row] = await db
      .update(chapterContent)
      .set(req.body as any)
      .where(eq(chapterContent.chapterId, chapterId))
      .returning();
    return res.json({ content: row });
  }
  const [row] = await db
    .insert(chapterContent)
    .values({ chapterId, ...(req.body as any) })
    .returning();
  res.status(201).json({ content: row });
}

export async function createMaterial(req: Request, res: Response) {
  const db = getDb();
  const chapterId = String(req.params.id);
  const file = (req as any).file as Express.Multer.File | undefined;
  const { type, title, description } = req.body as any;
  if (!file) throw ApiError.badRequest("PDF file required");
  const meta = await fileStorage.validateAndStore(file.buffer, file.originalname, file.mimetype);
  const [row] = await db
    .insert(studyMaterials)
    .values({
      chapterId,
      type: type || "pdf",
      title: title || file.originalname,
      description: description || null,
      fileId: meta.id,
    })
    .returning();
  res.status(201).json({ material: { ...row, fileUrl: fileUrl(meta.id) } });
}

export async function updateMaterial(req: Request, res: Response) {
  const db = getDb();
  const [row] = await db
    .update(studyMaterials)
    .set(req.body as any)
    .where(eq(studyMaterials.id, String(req.params.materialId)))
    .returning();
  res.json({ material: row });
}

export async function deleteMaterial(req: Request, res: Response) {
  const db = getDb();
  await db.delete(studyMaterials).where(eq(studyMaterials.id, String(req.params.materialId)));
  res.json({ ok: true });
}

export async function getMyClass(req: Request, res: Response) {
  const db = getDb();
  const user = (req as any).user;
  const grade = user?.className || "";
  const name = `Class ${grade.replace(/st|nd|rd|th/g, "").trim()}`;
  const cls = await db.query.classes.findFirst({
    where: and(eq(classes.status, "active"), eq(classes.name, name)),
  });
  if (!cls) return res.json({ class: null, subjects: [] });
  const subs = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      slug: subjects.slug,
      classSubjectId: classSubjects.id,
      orderIndex: classSubjects.orderIndex,
    })
    .from(classSubjects)
    .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
    .where(eq(classSubjects.classId, cls.id))
    .orderBy(asc(classSubjects.orderIndex));
  res.json({ class: cls, subjects: subs });
}

export async function searchContent(req: Request, res: Response) {
  const db = getDb();
  const q = ((req.query.q as string) || "").trim();
  const classId = req.query.classId as string | undefined;
  const subjectId = req.query.subjectId as string | undefined;
  if (!q && !classId && !subjectId) return res.json({ results: [] });

  const conditions = [] as any[];
  if (classId) conditions.push(eq(chapters.classId, classId));
  if (subjectId) conditions.push(eq(chapters.subjectId, subjectId));
  if (q)
    conditions.push(
      sql`(${chapters.title} ILIKE ${"%" + q + "%"} OR ${chapters.summary} ILIKE ${"%" + q + "%"})`,
    );

  const chapterRows = await db
    .select()
    .from(chapters)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(chapters.chapterNo))
    .limit(50);

  const enriched = await Promise.all(
    chapterRows.map(async (c) => {
      const sub = await db.query.subjects.findFirst({ where: eq(subjects.id, c.subjectId) });
      const cls = await db.query.classes.findFirst({ where: eq(classes.id, c.classId) });
      return {
        id: c.id,
        title: c.title,
        summary: c.summary,
        chapterNo: c.chapterNo,
        className: cls?.name || "",
        subjectName: sub?.name || "",
        classId: cls?.id,
        subjectId: sub?.id,
      };
    }),
  );
  res.json({ results: enriched });
}
