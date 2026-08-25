import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config";
import { ApiError } from "./errors";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { FileKind } from "../types";

const MIME_EXT: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "video/quicktime": ["mov"],
  "audio/mpeg": ["mp3"],
  "audio/mp3": ["mp3"],
  "audio/webm": ["webm"],
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
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  if (["mp3", "webm"].includes(ext)) return "audio";
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

export type ServeTarget =
  | { kind: "local"; path: string }
  | { kind: "redirect"; url: string };

/**
 * Storage abstraction. Two drivers:
 *  - LocalFileStorage: local filesystem. DEV ONLY. On Render the instance
 *    filesystem is ephemeral, so it must not be the permanent production store.
 *  - S3Storage: S3-compatible object storage (AWS S3, Cloudflare R2, DigitalOcean
 *    Spaces, MinIO). Production-durable; served via short-lived presigned URLs.
 * Selected with STORAGE_PROVIDER=s3 + S3_* env vars.
 */
export interface StorageProvider {
  validateAndStore(
    buffer: Buffer,
    originalName: string,
    declaredMime: string
  ): Promise<StoredFileMeta>;
  serveTarget(storedName: string): Promise<ServeTarget>;
  delete(storedName: string): Promise<void>;
}

class LocalFileStorage implements StorageProvider {
  constructor(private dir: string) {
    fs.mkdirSync(dir, { recursive: true });
    if (config.isProd && config.storageProvider === "local") {
      console.warn(
        "[storage] WARNING: using local filesystem storage in production. " +
          "This is NOT persistent on platforms like Render. Set STORAGE_PROVIDER=s3 for durable object storage."
      );
    }
  }

  async validateAndStore(
    buffer: Buffer,
    originalName: string,
    declaredMime: string
  ): Promise<StoredFileMeta> {
    let ext = path.extname(originalName).replace(".", "").toLowerCase();
    if (!ext) ext = extFromMime(declaredMime) || "bin";

    if (!config.allowedExtensions.includes(ext)) {
      throw ApiError.badRequest(`File type ".${ext}" is not allowed`);
    }
    if (buffer.length > config.maxUploadMb * 1024 * 1024) {
      throw ApiError.badRequest(`File exceeds the ${config.maxUploadMb}MB limit`);
    }
    if (ext === "bin" || declaredMime.startsWith("application/x-")) {
      throw ApiError.badRequest("Unsupported or unsafe file type");
    }

    const id = randomUUID();
    const storedName = `${id}.${ext}`;
    await fs.promises.writeFile(path.join(this.dir, storedName), buffer);
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

  async serveTarget(storedName: string): Promise<ServeTarget> {
    if (!/^[a-f0-9-]+\.[a-z0-9]+$/i.test(storedName)) {
      throw ApiError.badRequest("Invalid file reference");
    }
    return { kind: "local", path: path.join(this.dir, storedName) };
  }

  async delete(storedName: string): Promise<void> {
    try {
      await fs.promises.unlink(path.join(this.dir, storedName));
    } catch {
      /* ignore missing */
    }
  }
}

class S3Storage implements StorageProvider {
  private client: S3Client;

  constructor() {
    const endpoint = config.s3.endpoint || undefined;
    this.client = new S3Client({
      region: config.s3.region,
      endpoint,
      forcePathStyle: !!endpoint,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
    });
  }

  private async putObject(Key: string, Body: Buffer, ContentType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: config.s3.bucket, Key, Body, ContentType }));
  }

  async validateAndStore(
    buffer: Buffer,
    originalName: string,
    declaredMime: string
  ): Promise<StoredFileMeta> {
    let ext = path.extname(originalName).replace(".", "").toLowerCase();
    if (!ext) ext = extFromMime(declaredMime) || "bin";
    if (!config.allowedExtensions.includes(ext)) {
      throw ApiError.badRequest(`File type ".${ext}" is not allowed`);
    }
    if (buffer.length > config.maxUploadMb * 1024 * 1024) {
      throw ApiError.badRequest(`File exceeds the ${config.maxUploadMb}MB limit`);
    }
    if (ext === "bin" || declaredMime.startsWith("application/x-")) {
      throw ApiError.badRequest("Unsupported or unsafe file type");
    }

    const id = randomUUID();
    const storedName = `${id}.${ext}`;
    await this.putObject(storedName, buffer, declaredMime || extFromMime(ext) || "application/octet-stream");
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

  async serveTarget(storedName: string): Promise<ServeTarget> {
    if (!/^[a-f0-9-]+\.[a-z0-9]+$/i.test(storedName)) {
      throw ApiError.badRequest("Invalid file reference");
    }
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: config.s3.bucket, Key: storedName }),
      { expiresIn: 600 }
    );
    return { kind: "redirect", url };
  }

  async delete(storedName: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: storedName }));
    } catch {
      /* ignore */
    }
  }
}

function createStorage(): StorageProvider {
  if (config.storageProvider === "s3" && config.s3.bucket && config.s3.accessKeyId) {
    return new S3Storage();
  }
  if (config.isProd && config.storageProvider !== "s3") {
    console.warn(
      "[storage] Production is using local filesystem storage. Set STORAGE_PROVIDER=s3 with S3_* env vars for durable object storage."
    );
  }
  return new LocalFileStorage(config.uploadDir);
}

export const fileStorage: StorageProvider = createStorage();
