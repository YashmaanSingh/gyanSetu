import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { uploadMiddleware, uploadFile, serveFileById } from "../controllers/files.controller";

const router = Router();

router.use(requireAuth);
router.post("/uploads", uploadMiddleware.single("file"), uploadFile);
router.get("/files/:fileId", serveFileById);

export default router;
