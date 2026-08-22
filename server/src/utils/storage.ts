import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config";
import { ApiError } from "./errors";
import type { FileKind } from "../types";

const MIME_EXT: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "audio/mpeg": ["mp3"],
  "audio/mp3": ["mp3"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/zip": ["zip"],
};

function kindFromExt(ext: string): FileKind {
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  if (["mp4", "webm"].includes(ext)) return "video";
  if (["mp3"].includes(ext)) return "audio";
  if (["doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "csv", "zip"].includes(ext))
    return "doc";
  return "other";
}

function extFromMime(mime: string): string | null {
  return MIME_EXT[mime]?.[0] ?? null;
}

export interface StoredFileMeta {
  id: string;
  storedName: string;
  originalName: string;
  mimeType: string;
  ext: string;
  sizeBytes: number;
  kind: FileKind;
}

/**
 * Storage abstraction. Currently backed by the local filesystem. The interface
 * is intentionally small so a cloud driver (S3 / Cloudinary) can be added
 * later without changing controllers.
 */
class LocalFileStorage {
  constructor(private dir: string) {
    fs.mkdirSync(dir, { recursive: true });
  }

  validateAndStore(buffer: Buffer, originalName: string, declaredMime: string): StoredFileMeta {
    let ext = path.extname(originalName).replace(".", "").toLowerCase();
    if (!ext) ext = extFromMime(declaredMime) || "bin";

    if (!config.allowedExtensions.includes(ext)) {
      throw ApiError.badRequest(`File type ".${ext}" is not allowed`);
    }
    if (buffer.length > config.maxUploadMb * 1024 * 1024) {
      throw ApiError.badRequest(`File exceeds the ${config.maxUploadMb}MB limit`);
    }
    // Light validation: reject if declared mime clearly mismatches the extension's known mime set.
    const expected = Object.entries(MIME_EXT).filter(([, exts]) => exts.includes(ext));
    if (expected.length > 0 && declaredMime && declaredMime !== "application/octet-stream") {
      const allowedMimes = expected.map(([m]) => m);
      // Only enforce for clearly dangerous mismatches (e.g. executable-ish)
      if (ext === "bin" || declaredMime.startsWith("application/x-") ) {
        throw ApiError.badRequest("Unsupported or unsafe file type");
      }
    }

    const id = randomUUID();
    const storedName = `${id}.${ext}`;
    fs.writeFileSync(path.join(this.dir, storedName), buffer);
    return {
      id,
      storedName,
      originalName: originalName.slice(0, 255),
      mimeType: declaredMime || extFromMime(ext) || "application/octet-stream",
      ext,
      sizeBytes: buffer.length,
      kind: kindFromExt(ext),
    };
  }

  pathOf(storedName: string): string {
    if (!/^[a-f0-9-]+\.[a-z0-9]+$/i.test(storedName)) {
      throw ApiError.badRequest("Invalid file reference");
    }
    return path.join(this.dir, storedName);
  }

  async delete(storedName: string): Promise<void> {
    try {
      await fs.promises.unlink(this.pathOf(storedName));
    } catch {
      /* ignore missing */
    }
  }
}

export const fileStorage = new LocalFileStorage(config.uploadDir);
