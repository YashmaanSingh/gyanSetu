import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as c from "../controllers/admin.controller";
import { settingsSchema } from "../validators";

const router = Router();

router.use(requireAdmin);

router.get("/dashboard", c.dashboard);
router.get("/reports/students", c.reportStudents);
router.get("/reports/quizzes", c.reportQuizzes);
router.get("/reports/materials", c.reportMaterials);
router.get("/settings", c.getSettings);
router.put("/settings", validate(settingsSchema), c.updateSettings);

export default router;
