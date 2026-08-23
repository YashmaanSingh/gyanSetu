import { Response } from "express";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { getDb } from "../db";
import { sessions, users, notifications, settings } from "../db/schema";
import { config } from "../config";
import { generateRefreshToken, hashToken } from "./jwt";

export async function createSession(
  userId: string,
  userAgent: string | undefined,
  ip: string | undefined,
  expiresInSeconds: number
): Promise<string> {
  const token = generateRefreshToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  await getDb()
    .insert(sessions)
    .values({ userId, tokenHash, userAgent, ip, expiresAt });
  return token;
}

export function setRefreshCookie(res: Response, token: string, maxAgeSeconds: number) {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    sameSite: config.isProd ? "none" : "lax",
    secure: config.isProd,
    maxAge: maxAgeSeconds * 1000,
    path: "/",
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie("refresh_token", {
    sameSite: config.isProd ? "none" : "lax",
    secure: config.isProd,
    path: "/",
  });
}

export async function notifyAllStudents(opts: {
  type: string;
  title: string;
  body: string;
  linkUrl?: string | null;
  entityId?: string | null;
}) {
  const db = getDb();
  const studentRows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "student"), eq(users.status, "active"), isNull(users.deletedAt)));
  if (studentRows.length === 0) return;
  await db.insert(notifications).values(
    studentRows.map((s) => ({
      userId: s.id,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      linkUrl: opts.linkUrl ?? null,
      entityId: opts.entityId ?? null,
    }))
  );
}

export interface Pagination {
  page: number;
  pageSize: number;
  offset: number;
  total: number;
  totalPages: number;
}

export function buildPagination(total: number, page: number, pageSize: number): Pagination {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    total,
    totalPages,
  };
}

export async function getSettingsValue<T = any>(key: string, fallback: T): Promise<T> {
  const [row] = await getDb().select().from(settings).where(eq(settings.key, key)).limit(1);
  if (!row) return fallback;
  return (row.value as T) ?? fallback;
}

export async function getPlatformSettings() {
  const p = await getSettingsValue<{
    platformName?: string;
    platformTagline?: string;
    logoFileId?: string;
    themeColor?: string;
  }>("platform", {
    platformName: "GyaanSetu",
    platformTagline: "Student Learning Portal",
    themeColor: "#4f46e5",
  });
  const q = await getSettingsValue<{
    defaultTimeLimit?: number;
    defaultMaxAttempts?: number;
    defaultPassingScore?: number;
  }>("quiz", {
    defaultTimeLimit: 10,
    defaultMaxAttempts: 1,
    defaultPassingScore: 50,
  });
  const n = await getSettingsValue<{ notificationsEnabled?: boolean }>("notifications", {
    notificationsEnabled: true,
  });
  const u = await getSettingsValue<{ maxSizeMb?: number; allowedExtensions?: string }>("uploads", {
    maxSizeMb: 25,
    allowedExtensions: config.allowedExtensions.join(","),
  });
  return { platform: p, quiz: q, notifications: n, uploads: u };
}

export function fileUrl(id: string | number): string {
  return `/api/files/${id}`;
}

export function orderByColumn(column: any, dir: "asc" | "desc") {
  return dir === "asc" ? sql`${column} asc` : sql`${column} desc`;
}

export { desc };
