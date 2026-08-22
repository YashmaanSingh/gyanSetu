import { Request, Response } from "express";
import { and, eq, isNull, or } from "drizzle-orm";
import { getDb } from "../db";
import { users, students, adminProfiles, sessions, passwordResets } from "../db/schema";
import { ApiError } from "../utils/errors";
import { comparePassword, hashPassword } from "../utils/password";
import { signAccessToken, hashToken } from "../utils/jwt";
import { config } from "../config";
import {
  adminLoginSchema,
  studentLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../validators";
import {
  createSession,
  setRefreshCookie,
  clearRefreshCookie,
  notifyAllStudents,
} from "../utils/helpers";
import { sql } from "drizzle-orm";

export async function issueTokensAsync(res: Response, user: any, rememberMe?: boolean) {
  const expiresIn = Math.round(config.jwtRefreshExpiresIn * (rememberMe ? 1 : 0.25));
  const token = await createSession(
    user.id,
    (res.req as any)?.headers?.["user-agent"],
    (res.req as any)?.ip,
    expiresIn
  );
  setRefreshCookie(res, token, expiresIn);
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  return accessToken;
}

async function loadProfile(userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ u: users, s: students, a: adminProfiles })
    .from(users)
    .leftJoin(students, eq(students.userId, users.id))
    .leftJoin(adminProfiles, eq(adminProfiles.userId, users.id))
    .where(eq(users.id, userId));
  if (!row) throw ApiError.unauthorized("Account not found");
  const base = {
    id: row.u.id,
    name: row.u.name,
    email: row.u.email,
    role: row.u.role,
    status: row.u.status,
    avatarFileId: row.u.avatarFileId,
  };
  if (row.u.role === "student" && row.s) {
    return {
      ...base,
      studentCode: row.s.studentCode,
      phone: row.s.phone,
      courseId: row.s.courseId,
      batch: row.s.batch,
      guardianName: row.s.guardianName,
      enrollmentDate: row.s.enrollmentDate,
    };
  }
  if (row.u.role === "admin" && row.a) {
    return {
      ...base,
      phone: row.a.phone,
      designation: row.a.designation,
      bio: row.a.bio,
    };
  }
  return base;
}

export async function adminLogin(req: Request, res: Response) {
  const { identifier, email, password, rememberMe } = adminLoginSchema.parse(req.body);
  const loginEmail = (identifier || email || "").toLowerCase().trim();
  const [user] = await getDb()
    .select()
    .from(users)
    .where(
      and(
        eq(users.role, "admin"),
        eq(users.email, loginEmail),
        isNull(users.deletedAt)
      )
    )
    .limit(1);
  if (!user || user.status !== "active") throw ApiError.unauthorized("Invalid credentials");
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized("Invalid credentials");
  await getDb().update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  const accessToken = await issueTokensAsync(res, user, rememberMe);
  res.json({ accessToken, user: await loadProfile(user.id) });
}

export async function studentLogin(req: Request, res: Response) {
  const { identifier, password, rememberMe } = studentLoginSchema.parse(req.body);
  const id = identifier.trim();
  const [row] = await getDb()
    .select({ u: users, s: students })
    .from(users)
    .innerJoin(students, eq(students.userId, users.id))
    .where(
      and(
        eq(users.role, "student"),
        isNull(users.deletedAt),
        or(eq(students.studentCode, id), eq(users.email, id.toLowerCase()))
      )
    )
    .limit(1);
  if (!row || row.u.status !== "active") throw ApiError.unauthorized("Invalid credentials");
  const ok = await comparePassword(password, row.u.passwordHash);
  if (!ok) throw ApiError.unauthorized("Invalid credentials");
  await getDb().update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, row.u.id));
  const accessToken = await issueTokensAsync(res, row.u, rememberMe);
  res.json({ accessToken, user: await loadProfile(row.u.id) });
}

export async function refresh(req: Request, res: Response) {
  const cookieToken = (req.cookies as any)?.refresh_token;
  if (!cookieToken) throw ApiError.unauthorized("No refresh token");
  const tokenHash = hashToken(cookieToken);
  const db = getDb();
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);
  if (!session || session.revokedAt || session.expiresAt < new Date())
    throw ApiError.unauthorized("Session expired");
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, session.userId), isNull(users.deletedAt)))
    .limit(1);
  if (!user || user.status !== "active") throw ApiError.unauthorized("Account unavailable");
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  res.json({ accessToken, user: await loadProfile(user.id) });
}

export async function logout(req: Request, res: Response) {
  const cookieToken = (req.cookies as any)?.refresh_token;
  if (cookieToken) {
    const tokenHash = hashToken(cookieToken);
    await getDb()
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, tokenHash));
  }
  clearRefreshCookie(res);
  res.json({ success: true });
}

export async function me(req: Request, res: Response) {
  const user = await loadProfile((req as any).user.id);
  res.json({ user });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotPasswordSchema.parse(req.body);
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email.toLowerCase().trim()), isNull(users.deletedAt)))
    .limit(1);
  if (user && user.status === "active") {
    const token = require("crypto").randomBytes(32).toString("hex");
    await db.insert(passwordResets).values({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    if (config.devReturnResetToken) {
      return res.json({ message: "Reset link generated (dev mode).", resetToken: token });
    }
  }
  res.json({ message: "If the email exists, a reset link has been sent." });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = resetPasswordSchema.parse(req.body);
  const db = getDb();
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.tokenHash, tokenHash))
    .limit(1);
  if (!row || row.usedAt || row.expiresAt < new Date())
    throw ApiError.badRequest("Invalid or expired reset token");
  const hash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash: hash }).where(eq(users.id, row.userId));
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, row.id));
  await db.delete(sessions).where(eq(sessions.userId, row.userId));
  res.json({ success: true, message: "Password updated. Please log in." });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const db = getDb();
  const userId = (req as any).user.id;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw ApiError.unauthorized();
  const ok = await comparePassword(currentPassword, user.passwordHash);
  if (!ok) throw ApiError.badRequest("Current password is incorrect");
  const hash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash: hash }).where(eq(users.id, userId));
  res.json({ success: true, message: "Password changed successfully." });
}

export { loadProfile };
