import { Request, Response, NextFunction } from "express";
import { tooMany } from "../utils/errors";

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

function cleanup() {
  const now = Date.now();
  for (const [key, b] of store.entries()) {
    if (b.resetAt <= now) store.delete(key);
  }
}
setInterval(cleanup, 60_000).unref();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  key?: (req: Request) => string;
  message?: string;
}

export function rateLimit(opts: RateLimitOptions) {
  const { windowMs, max, key, message } = opts;
  return (req: Request, res: Response, next: NextFunction) => {
    const id = key ? key(req) : (req.ip || "unknown");
    const now = Date.now();
    let bucket = store.get(id);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      store.set(id, bucket);
    }
    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return next(tooMany(message || "Too many requests, please slow down."));
    }
    next();
  };
}

export function loginRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    key: (req) => `login:${req.ip}:${(req.body?.email || req.body?.identifier || "").toString().toLowerCase()}`,
    message: "Too many login attempts. Try again later.",
  });
}
