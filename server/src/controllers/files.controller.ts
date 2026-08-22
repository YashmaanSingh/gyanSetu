import { Request, Response } from "express";
import multer from "multer";
import fs from "node:fs";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { files } from "../db/schema";
import { config } from "../config";
import { fileStorage } from "../utils/storage";
import { fileUrl } from "../utils/helpers";
import { ApiError } from "../utils/errors";

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
});

export async function uploadFile(req: Request, res: Response) {
  const f = (req as any).file;
  if (!f) throw ApiError.badRequest("No file provided");
  const meta = fileStorage.validateAndStore(f.buffer, f.originalname, f.mimetype);
  const [row] = (await getDb()
    .insert(files)
    .values({
      originalName: meta.originalName,
      storedName: meta.storedName,
      mimeType: meta.mimeType,
      ext: meta.ext,
      sizeBytes: meta.sizeBytes,
      kind: meta.kind,
      uploadedBy: (req as any).user?.id,
    })
    .returning()) as any[];
  res.status(201).json({
    file: {
      id: row.id,
      originalName: row.originalName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      kind: row.kind,
      url: fileUrl(row.id),
    },
  });
}

async function streamStored(res: Response, storedName: string, req: Request) {
  const abs = fileStorage.pathOf(storedName);
  if (!fs.existsSync(abs)) throw ApiError.notFound("File not found");
  const [row] = (await getDb().select().from(files).where(eq(files.storedName, storedName)).limit(1)) as any[];
  const mime = row?.mimeType || "application/octet-stream";
  const download = req.query.download === "1" || req.query.download === "true";
  const name = row?.originalName || storedName;
  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(name)}"`);
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.sendFile(abs);
}

export async function serveFile(req: Request, res: Response) {
  await streamStored(res, String(req.params.storedName), req);
}

export async function serveFileById(req: Request, res: Response) {
  const [row] = await getDb().select().from(files).where(eq(files.id, String(req.params.fileId))).limit(1);
  if (!row) throw ApiError.notFound("File not found");
  await streamStored(res, row.storedName, req);
}
