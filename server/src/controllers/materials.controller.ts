import { Request, Response } from "express";
import { and, desc, eq, isNull, like, or, sql, count } from "drizzle-orm";
import { getDb } from "../db";
import {
  users,
  students,
  materials,
  subjects,
  courses,
  files,
  materialCompletions,
  materialViews,
} from "../db/schema";
import { ApiError } from "../utils/errors";
import {
  createMaterialSchema,
  updateMaterialSchema,
  paginationSchema,
} from "../validators";
import { buildPagination, notifyAllStudents, fileUrl } from "../utils/helpers";

function studentScope(userId: string) {
  return getDb()
    .select({ courseId: students.courseId, batch: students.batch })
    .from(students)
    .where(eq(students.userId, userId))
    .limit(1);
}

function serialize(row: any) {
  return {
    id: row.m.id,
    title: row.m.title,
    description: row.m.description,
    type: row.m.type,
    subjectId: row.m.subjectId,
    subjectName: row.s?.name ?? null,
    courseId: row.m.courseId,
    courseName: row.c?.name ?? null,
    topic: row.m.topic,
    externalUrl: row.m.externalUrl,
    author: row.m.author,
    visibility: row.m.visibility,
    batch: row.m.batch,
    status: row.m.status,
    downloadAllowed: row.m.downloadAllowed,
    viewCount: row.m.viewCount,
    publishedAt: row.m.publishedAt,
    createdAt: row.m.createdAt,
    file: row.f
      ? {
          id: row.f.id,
          originalName: row.f.originalName,
          mimeType: row.f.mimeType,
          sizeBytes: row.f.sizeBytes,
          url: fileUrl(row.f.id),
        }
      : null,
    thumbnailUrl: row.m.thumbnailFileId ? `/api/files/${row.m.thumbnailFileId}` : null,
    completed: row.completed ?? false,
  };
}

export async function listMaterials(req: Request, res: Response) {
  const isAdmin = (req as any).user.role === "admin";
  const { page, pageSize, q, sort } = paginationSchema.parse(req.query);
  const type = req.query.type as string | undefined;
  const subjectId = req.query.subjectId as string | undefined;
  const courseId = req.query.courseId as string | undefined;
  const status = req.query.status as string | undefined;

  const db = getDb();
  const conditions = [isNull(materials.deletedAt)];
  if (type) conditions.push(eq(materials.type, type as any));
  if (subjectId) conditions.push(eq(materials.subjectId, subjectId));
  if (courseId) conditions.push(eq(materials.courseId, courseId));
  if (!isAdmin) {
    conditions.push(eq(materials.status, "published"));
    const [scope] = await studentScope((req as any).user.id);
    conditions.push(
      sql`(${materials.visibility} = 'all' OR (${materials.visibility} = 'course' AND ${materials.courseId} = ${scope?.courseId ?? null}) OR (${materials.visibility} = 'batch' AND ${materials.batch} = ${scope?.batch ?? ""}))`
    );
  } else if (status) {
    conditions.push(eq(materials.status, status as any));
  }
  if (q) {
    conditions.push(or(like(materials.title, `%${q}%`), like(materials.description, `%${q}%`)) as any);
  }

  const where = and(...(conditions.filter(Boolean) as any));
  const [{ total }] = await db.select({ total: count() }).from(materials).where(where);

  const orderExpr =
    sort === "oldest" ? materials.createdAt : sort === "title" ? materials.title : desc(materials.createdAt);

  const rows = await db
    .select({ m: materials, s: subjects, c: courses, f: files })
    .from(materials)
    .leftJoin(subjects, eq(materials.subjectId, subjects.id))
    .leftJoin(courses, eq(materials.courseId, courses.id))
    .leftJoin(files, eq(materials.fileId, files.id))
    .where(where)
    .orderBy(orderExpr)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  let completedSet = new Set<string>();
  if (!isAdmin) {
    const comp = await db
      .select({ mid: materialCompletions.materialId })
      .from(materialCompletions)
      .where(eq(materialCompletions.studentUserId, (req as any).user.id));
    completedSet = new Set(comp.map((c) => c.mid));
  }

  res.json({
    materials: rows.map((r) => serialize({ ...r, completed: completedSet.has(r.m.id) })),
    pagination: buildPagination(Number(total), page, pageSize),
  });
}

export async function getMaterial(req: Request, res: Response) {
  const isAdmin = (req as any).user.role === "admin";
  const db = getDb();
  const [row] = await db
    .select({ m: materials, s: subjects, c: courses, f: files })
    .from(materials)
    .leftJoin(subjects, eq(materials.subjectId, subjects.id))
    .leftJoin(courses, eq(materials.courseId, courses.id))
    .leftJoin(files, eq(materials.fileId, files.id))
    .where(and(eq(materials.id, String(req.params.id)), isNull(materials.deletedAt)))
    .limit(1);
  if (!row) throw ApiError.notFound("Material not found");
  if (!isAdmin) {
    if (row.m.status !== "published") throw ApiError.forbidden("Not available");
    const [scope] = await studentScope((req as any).user.id);
    const visible =
      row.m.visibility === "all" ||
      (row.m.visibility === "course" && row.m.courseId === (scope?.courseId ?? null)) ||
      (row.m.visibility === "batch" && row.m.batch === (scope?.batch ?? ""));
    if (!visible) throw ApiError.forbidden("Not available");
    await db
      .insert(materialViews)
      .values({ materialId: row.m.id, studentUserId: (req as any).user.id })
      .onConflictDoNothing();
    await db.update(materials).set({ viewCount: sql`${materials.viewCount} + 1` }).where(eq(materials.id, row.m.id));
  }
  res.json({ material: serialize({ ...row, completed: false }) });
}

export async function createMaterial(req: Request, res: Response) {
  const data = createMaterialSchema.parse(req.body);
  const db = getDb();
  const isPublish = data.status === "published";
  const [inserted] = await db
    .insert(materials)
    .values({
      title: data.title.trim(),
      description: data.description || null,
      type: data.type,
      subjectId: data.subjectId || null,
      courseId: data.courseId || null,
      topic: data.topic || null,
      fileId: data.fileId || null,
      externalUrl: data.externalUrl || null,
      thumbnailFileId: data.thumbnailFileId || null,
      author: data.author || null,
      visibility: data.visibility ?? "all",
      batch: data.batch || null,
      status: data.status ?? "draft",
      downloadAllowed: data.downloadAllowed ?? true,
      publishedAt: isPublish ? new Date() : null,
      createdBy: (req as any).user.id,
    })
    .returning();
  if (isPublish) {
    await notifyAllStudents({
      type: "material",
      title: "New study material",
      body: `${data.type === "book" ? "Book" : "Material"} "${data.title}" was added.`,
      linkUrl: `/student/materials/${inserted.id}`,
      entityId: inserted.id,
    });
  }
  res.status(201).json({ material: serialize({ m: inserted, s: null, c: null, f: null, tf: null }) });
}

export async function updateMaterial(req: Request, res: Response) {
  const data = updateMaterialSchema.parse(req.body);
  const db = getDb();
  const [existing] = await db
    .select()
    .from(materials)
    .where(and(eq(materials.id, String(req.params.id)), isNull(materials.deletedAt)))
    .limit(1);
  if (!existing) throw ApiError.notFound("Material not found");
  const wasPublished = existing.status === "published";
  const next = {
    title: data.title?.trim() ?? existing.title,
    description: data.description ?? existing.description,
    type: data.type ?? existing.type,
    subjectId: data.subjectId ?? existing.subjectId,
    courseId: data.courseId ?? existing.courseId,
    topic: data.topic ?? existing.topic,
    fileId: data.fileId ?? existing.fileId,
    externalUrl: data.externalUrl ?? existing.externalUrl,
    thumbnailFileId: data.thumbnailFileId ?? existing.thumbnailFileId,
    author: data.author ?? existing.author,
    visibility: data.visibility ?? existing.visibility,
    batch: data.batch ?? existing.batch,
    status: data.status ?? existing.status,
    downloadAllowed: data.downloadAllowed ?? existing.downloadAllowed,
    publishedAt: data.status === "published" && !wasPublished ? new Date() : existing.publishedAt,
    updatedAt: new Date(),
  };
  await db.update(materials).set(next).where(eq(materials.id, existing.id));
  if (data.status === "published" && !wasPublished) {
    await notifyAllStudents({
      type: "material",
      title: "New study material",
      body: `${next.type === "book" ? "Book" : "Material"} "${next.title}" was added.`,
      linkUrl: `/student/materials/${existing.id}`,
      entityId: existing.id,
    });
  }
  const [row] = await db
    .select({ m: materials, s: subjects, c: courses, f: files })
    .from(materials)
    .leftJoin(subjects, eq(materials.subjectId, subjects.id))
    .leftJoin(courses, eq(materials.courseId, courses.id))
    .leftJoin(files, eq(materials.fileId, files.id))
    .where(eq(materials.id, existing.id));
  res.json({ material: serialize(row) });
}

export async function patchMaterialStatus(req: Request, res: Response) {
  const status = req.body?.status as "draft" | "published" | "archived" | undefined;
  if (!["draft", "published", "archived"].includes(status as string))
    throw ApiError.badRequest("Invalid status");
  const db = getDb();
  const [existing] = await db
    .select()
    .from(materials)
    .where(and(eq(materials.id, String(req.params.id)), isNull(materials.deletedAt)))
    .limit(1);
  if (!existing) throw ApiError.notFound("Material not found");
  const wasPublished = existing.status === "published";
  await db
    .update(materials)
    .set({
      status,
      publishedAt: status === "published" && !wasPublished ? new Date() : existing.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(materials.id, existing.id));
  if (status === "published" && !wasPublished) {
    await notifyAllStudents({
      type: "material",
      title: "New study material",
      body: `${existing.type === "book" ? "Book" : "Material"} "${existing.title}" was added.`,
      linkUrl: `/student/materials/${existing.id}`,
      entityId: existing.id,
    });
  }
  res.json({ success: true, status });
}

export async function deleteMaterial(req: Request, res: Response) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(materials)
    .where(and(eq(materials.id, String(req.params.id)), isNull(materials.deletedAt)))
    .limit(1);
  if (!existing) throw ApiError.notFound("Material not found");
  await db.update(materials).set({ deletedAt: new Date(), status: "archived" }).where(eq(materials.id, existing.id));
  res.json({ success: true });
}

export async function completeMaterial(req: Request, res: Response) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(materials)
    .where(
      and(
        eq(materials.id, String(req.params.id)),
        isNull(materials.deletedAt),
        eq(materials.status, "published")
      )
    )
    .limit(1);
  if (!existing) throw ApiError.notFound("Material not found");
  await db
    .insert(materialCompletions)
    .values({ materialId: existing.id, studentUserId: (req as any).user.id })
    .onConflictDoNothing();
  res.json({ success: true, completed: true });
}
