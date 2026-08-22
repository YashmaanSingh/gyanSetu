import express, { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "node:fs";
import path from "node:path";
import { config, corsOrigins } from "./config";
import { mountRoutes } from "./routes";
import { requireAuth } from "./middleware/auth";
import * as profileController from "./controllers/profile.controller";
import { ApiError } from "./utils/errors";

export function createApp(): Express {
  const app = express();

  if (config.trustProxy) app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(cors({ origin: corsOrigins(), credentials: true }));
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get("/api/health", (_req: Request, res: Response) => res.json({ status: "OK" }));
  app.put("/api/profile", requireAuth, profileController.updateProfile);

  mountRoutes(app);

  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({ error: "Route not found" });
  });

  // Serve the built client SPA (single-origin production deployment).
  if (config.clientDist && fs.existsSync(config.clientDist)) {
    app.use(express.static(config.clientDist));
    app.get(/^(?!\/api\/).*/, (_req: Request, res: Response) => {
      res.sendFile(path.join(config.clientDist, "index.html"));
    });
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    if (err?.type === "entity.too.large" || err?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large" });
    }
    console.error("Unhandled error:", err);
    res.status(err?.status || 500).json({ error: err.message || "Internal server error" });
  });

  return app;
}
