import { Request, Response } from "express";
import { and, desc, eq, isNull, sql, count } from "drizzle-orm";
import { getDb } from "../db";
import { notifications } from "../db/schema";
import { ApiError } from "../utils/errors";
import { paginationSchema } from "../validators";
import { buildPagination } from "../utils/helpers";

export async function listNotifications(req: Request, res: Response) {
  const userId = (req as any).user.id;
  const { page, pageSize } = paginationSchema.parse(req.query);
  const db = getDb();
  const [{ total, unread }] = await db
    .select({ total: count(), unread: sql<number>`cast(count(*) filter (where ${notifications.readAt} is null) as int)` })
    .from(notifications)
    .where(eq(notifications.userId, userId));
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  res.json({
    notifications: rows,
    unreadCount: Number(unread),
    pagination: buildPagination(Number(total), page, pageSize),
  });
}

export async function unreadCount(req: Request, res: Response) {
  const userId = (req as any).user.id;
  const db = getDb();
  const [{ unread }] = await db
    .select({ unread: sql<number>`cast(count(*) filter (where ${notifications.readAt} is null) as int)` })
    .from(notifications)
    .where(eq(notifications.userId, userId));
  res.json({ unreadCount: Number(unread) });
}

export async function markRead(req: Request, res: Response) {
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, String(req.params.id)), eq(notifications.userId, (req as any).user.id)));
  res.json({ success: true });
}

export async function markAllRead(req: Request, res: Response) {
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(eq(notifications.userId, (req as any).user.id));
  res.json({ success: true });
}
