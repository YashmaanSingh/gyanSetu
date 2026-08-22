import path from "node:path";
import fs from "node:fs";

function env(key: string, def: string): string {
  const v = process.env[key];
  return v === undefined || v === "" ? def : v;
}

function num(key: string, def: number): number {
  const v = process.env[key];
  if (v === undefined || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export const config = {
  port: num("PORT", 5000),
  frontendUrl: env("FRONTEND_URL", "http://localhost:5173"),
  corsOrigin: env("CORS_ORIGIN", ""),
  jwtAccessSecret: env("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
  jwtAccessExpiresIn: num("JWT_ACCESS_EXPIRES_IN", 900),
  jwtRefreshExpiresIn: num("JWT_REFRESH_EXPIRES_IN", 2592000),
  uploadDir: path.resolve(env("UPLOAD_DIR", "./uploads")),
  allowedExtensions: env(
    "ALLOWED_EXTENSIONS",
    "pdf,doc,docx,ppt,pptx,xls,xlsx,jpg,jpeg,png,webp,gif,mp4,webm,mp3,zip,txt"
  )
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  maxUploadMb: num("MAX_UPLOAD_MB", 25),
  dataDir: env(
    "DATA_DIR",
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "GyaanSetu", "data")
      : path.resolve("./.data")
  ),
  clientDist: env("CLIENT_DIST", "") || path.resolve(process.cwd(), "client", "dist"),
  trustProxy: env("TRUST_PROXY", "1") === "1",
  devReturnResetToken: env("DEV_RETURN_RESET_TOKEN", "true") === "true",
  isProd: env("NODE_ENV", "development") === "production",
  apiBase: env("API_BASE", "/api"),
};

export function corsOrigins(): string[] | string | boolean {
  if (config.corsOrigin) {
    const list = config.corsOrigin
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length) return list;
  }
  return config.frontendUrl;
}

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}
if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}
