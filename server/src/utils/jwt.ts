import jwt from "jsonwebtoken";
import { config } from "../config";

export interface AccessTokenPayload {
  sub: string;
  role: "admin" | "student";
  typ: "access";
}

export function signAccessToken(payload: Omit<AccessTokenPayload, "typ">): string {
  return jwt.sign({ ...payload, typ: "access" }, config.jwtAccessSecret, {
    expiresIn: config.jwtAccessExpiresIn,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, config.jwtAccessSecret) as AccessTokenPayload;
  if (decoded.typ !== "access") throw new Error("Invalid token type");
  return decoded;
}

export function generateRefreshToken(): string {
  return require("crypto").randomBytes(48).toString("hex");
}

export function hashToken(token: string): string {
  return require("crypto").createHash("sha256").update(token).digest("hex");
}
