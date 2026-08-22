import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth";
import * as c from "../controllers/meta.controller";

const router = Router();

router.get("/subjects", c.listSubjects);
router.get("/courses", c.listCourses);
router.use(requireAuth);
router.post("/subjects", requireAdmin, c.createSubject);
router.post("/courses", requireAdmin, c.createCourse);

export default router;
