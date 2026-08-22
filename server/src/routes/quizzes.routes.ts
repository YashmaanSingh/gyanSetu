import { Router } from "express";
import { requireAdmin, requireStudent, requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as c from "../controllers/quizzes.controller";
import { attemptSubmitSchema } from "../validators";

const router = Router();

router.use(requireAuth);

router.get("/attempts/mine", requireStudent, c.getStudentAttempts);
router.get("/:activityId", requireStudent, c.getQuiz);
router.post("/:activityId/start", requireStudent, c.startQuiz);
router.post("/:attemptId/submit", requireStudent, validate(attemptSubmitSchema), c.submitQuiz);
router.get("/:attemptId/result", c.getResult);

export default router;
