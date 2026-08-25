import { Router } from "express";
import * as content from "../controllers/content.controller";
import { uploadMiddleware, materialUploadMiddleware } from "../controllers/files.controller";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

// ---- Read (authenticated users) ----
router.get("/classes", requireAuth, content.listClasses);
router.get("/subjects", requireAuth, content.listSubjects);
router.get("/classes/:classId/subjects", requireAuth, content.getClassSubjects);
router.get("/classes/:classId/subjects/:subjectId/chapters", requireAuth, content.getSubjectChapters);
router.get("/chapters/:id", requireAuth, content.getChapter);
router.get("/my-class", requireAuth, content.getMyClass);
router.get("/search", requireAuth, content.searchContent);

// ---- Admin: classes ----
router.post("/classes", requireAdmin, content.createClass);
router.put("/classes/:id", requireAdmin, content.updateClass);
router.delete("/classes/:id", requireAdmin, content.archiveClass);

// ---- Admin: subjects ----
router.post("/subjects", requireAdmin, content.createSubject);
router.put("/subjects/:id", requireAdmin, content.updateSubject);
router.delete("/subjects/:id", requireAdmin, content.deleteSubject);

// ---- Admin: class-subject mapping ----
router.post("/class-subjects", requireAdmin, content.addClassSubject);
router.delete("/class-subjects/:id", requireAdmin, content.removeClassSubject);

// ---- Admin: chapters ----
router.post("/chapters", requireAdmin, content.createChapter);
router.put("/chapters/:id", requireAdmin, content.updateChapter);
router.delete("/chapters/:id", requireAdmin, content.deleteChapter);
router.put("/chapters/:id/content", requireAdmin, content.upsertChapterContent);

// ---- Admin: study materials (PDF) ----
router.post(
  "/chapters/:id/materials",
  requireAdmin,
  materialUploadMiddleware.single("file"),
  content.createMaterial,
);
router.put("/materials/:materialId", requireAdmin, content.updateMaterial);
router.delete("/materials/:materialId", requireAdmin, content.deleteMaterial);

export default router;
