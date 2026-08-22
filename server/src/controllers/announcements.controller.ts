import { Request, Response } from "express";
import { and, desc, eq, isNull, like, or, sql, count } from "drizzle-orm";
import { getDb } from "../db";
import { announcements, files, users, students } from "../db/schema";
import { ApiError } from "../utils/errors";
import { announcementSchema, paginationSchema } from "../validators";
import { buildPagination, fileUrl } from "../utils/helpers";

function serialize(row: any) {
  return {
    id: row.a.id,
    title: row.a.title,
    message: row.a.message,
    priority: row.a.priority,
    publishDate: row.a.publishDate,
    expiryDate: row.a.expiryDate,
    targetRole: row.a.targetRole,
    imageUrl: row.f ? fileUrl(row.f.id) : null,
    createdAt: row.a.createdAt,
  };
}

export async function listAnnouncements(req: Request, res: Response) {
  const isAdmin = (req as any).user.role === "admin";
  const { page, pageSize, q } = paginationSchema.parse(req.query);
  const db = getDb();
  const conditions = [isNull(announcements.deletedAt)];
  if (!isAdmin) {
    conditions.push(sql`${announcements.targetRole} in ('all','students')`);
    conditions.push(sql`${announcements.publishDate} <= now()`);
    conditions.push(sql`(${announcements.expiryDate} is null or ${announcements.expiryDate} > now())`);
  }
  if (q) conditions.push(like(announcements.title, `%${q}%`));
  const where = and(...(conditions.filter(Boolean) as any));
  const [{ total }] = await db.select({ total: count() }).from(announcements).where(where);
  const rows = await db
    .select({ a: announcements, f: files })
    .from(announcements)
    .leftJoin(files, eq(announcements.imageFileId, files.id))
    .where(where)
    .orderBy(desc(announcements.publishDate))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  res.json({ announcements: rows.map(serialize), pagination: buildPagination(Number(total), page, pageSize) });
}

export async function getAnnouncement(req: Request, res: Response) {
  const db = getDb();
  const [row] = await db
    .select({ a: announcements, f: files })
    .from(announcements)
    .leftJoin(files, eq(announcements.imageFileId, files.id))
    .where(and(eq(announcements.id, String(req.params.id)), isNull(announcements.deletedAt)))
    .limit(1);
  if (!row) throw ApiError.notFound("Announcement not found");
  res.json({ announcement: serialize(row) });
}

export async function createAnnouncement(req: Request, res: Response) {
  const data = announcementSchema.parse(req.body);
  const db = getDb();
  const [inserted] = await db
    .insert(announcements)
    .values({
      title: data.title.trim(),
      message: data.message,
      imageFileId: data.imageFileId || null,
      priority: data.priority ?? "normal",
      publishDate: data.publishDate ? new Date(data.publishDate) : new Date(),
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      targetRole: data.targetRole ?? "all",
      createdBy: (req as any).user.id,
    })
    .returning();
  if (inserted.targetRole === "all" || inserted.targetRole === "students") {
    await getDb().insert(require("../db/schema").notifications).values(
      (await getDb().select({ id: users.id }).from(users).where(and(eq(users.role, "student"), eq(users.status, "active"), isNull(users.deletedAt)))).map((s) => ({
        userId: s.id,
        type: "announcement",
        title: "New announcement",
        body: inserted.title,
        linkUrl: "/student/announcements",
        entityId: inserted.id,
      }))
    );
  }
  res.status(201).json({ announcement: serialize({ a: inserted, f: null }) });
}

export async function updateAnnouncement(req: Request, res: Response) {
  const data = announcementSchema.parse(req.body);
  const db = getDb();
  const [existing] = await db
    .select()
    .from(announcements)
    .where(and(eq(announcements.id, String(req.params.id)), isNull(announcements.deletedAt)))
    .limit(1);
  if (!existing) throw ApiError.notFound("Announcement not found");
  await db
    .update(announcements)
    .set({
      title: data.title.trim(),
      message: data.message,
      imageFileId: data.imageFileId || null,
      priority: data.priority ?? existing.priority,
      publishDate: data.publishDate ? new Date(data.publishDate) : existing.publishDate,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : existing.expiryDate,
      targetRole: data.targetRole ?? existing.targetRole,
      updatedAt: new Date(),
    })
    .where(eq(announcements.id, existing.id));
  const [row] = await db
    .select({ a: announcements, f: files })
    .from(announcements)
    .leftJoin(files, eq(announcements.imageFileId, files.id))
    .where(eq(announcements.id, existing.id));
  res.json({ announcement: serialize(row) });
}

export async function deleteAnnouncement(req: Request, res: Response) {
  const db = getDb();
  await db.update(announcements).set({ deletedAt: new Date() }).where(eq(announcements.id, String(req.params.id)));
  res.json({ success: true });
}
