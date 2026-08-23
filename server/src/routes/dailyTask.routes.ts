import { Router } from "express";
import * as dt from "../controllers/dailyTask.controller";
import { requireAuth, requireAdmin, requireStudent } from "../middleware/auth";

const router = Router();

// Admin
router.post("/", requireAdmin, dt.createDailyTask);
router.get("/", requireAdmin, dt.listDailyTasks);
router.get("/:id/admin", requireAdmin, dt.getDailyTaskAdmin);
router.put("/:id", requireAdmin, dt.updateDailyTask);
router.delete("/:id", requireAdmin, dt.deleteDailyTask);
router.post("/:id/publish", requireAdmin, dt.publishDailyTask);
router.get("/:id/submissions", requireAdmin, dt.getSubmissions);
router.get("/submissions/:submissionId", requireAdmin, dt.getSubmissionDetail);
router.post("/submissions/:submissionId/review", requireAdmin, dt.reviewSubmission);

// Student
router.get("/today", requireStudent, dt.getToday);
router.get("/history", requireStudent, dt.getHistory);
router.get("/:id", requireStudent, dt.getStudentTaskDetail);
router.post("/:id/submit", requireStudent, dt.submitDailyTask);

export default router;
