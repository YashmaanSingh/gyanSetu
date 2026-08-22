import { Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { ApiError } from "../utils/errors";
import { getDb } from "../db";
import { users } from "../db/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { Request } from "express";

function extractToken(req: Request): string | undefined {
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.access_token;
  const header = req.headers.authorization;
  if (cookieToken) return cookieToken;
  if (header && typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return undefined;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) return next(ApiError.unauthorized("Authentication required"));
    let payload: any;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return next(ApiError.unauthorized("Invalid or expired token"));
    }
    const [user] = await getDb()
      .select({
        id: users.id,
        role: users.role,
        name: users.name,
        email: users.email,
        status: users.status,
      })
      .from(users)
      .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)));
    if (!user) return next(ApiError.unauthorized("Account not found"));
    if (user.status !== "active")
      return next(ApiError.forbidden("Account is inactive or suspended"));
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

export function requireRole(...roles: ("admin" | "student")[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role))
      return next(ApiError.forbidden("You do not have access to this resource"));
    next();
  };
}

export const requireAdmin = [requireAuth, requireRole("admin")];
export const requireStudent = [requireAuth, requireRole("student")];
