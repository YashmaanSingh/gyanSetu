import { Request, Response } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { users, students, adminProfiles } from "../db/schema";
import { ApiError } from "../utils/errors";
import { loadProfile } from "./auth.controller";

export async function updateProfile(req: Request, res: Response) {
  const userId = (req as any).user.id;
  const role = (req as any).user.role;
  const db = getDb();
  const body = req.body || {};
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  await db
    .update(users)
    .set({ name: name ?? undefined, avatarFileId: body.avatarFileId ?? undefined, updatedAt: new Date() })
    .where(eq(users.id, userId));

  if (role === "student") {
    await db
      .update(students)
      .set({
        phone: body.phone ?? undefined,
        className: body.className ?? undefined,
        guardianName: body.guardianName ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(students.userId, userId));
  } else {
    await db
      .update(adminProfiles)
      .set({
        phone: body.phone ?? undefined,
        designation: body.designation ?? undefined,
        bio: body.bio ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(adminProfiles.userId, userId));
  }
  res.json({ user: await loadProfile(userId) });
}
