import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as c from "../controllers/students.controller";
import { createStudentSchema, updateStudentSchema, registerStudentSchema } from "../validators";

const router = Router();

router.post("/register", validate(registerStudentSchema), c.registerStudent);
router.get("/me/progress", requireAuth, c.myProgress);
router.use(requireAdmin);
router.get("/", c.listStudents);
router.post("/", validate(createStudentSchema), c.createStudent);
router.get("/:id", c.getStudent);
router.put("/:id", validate(updateStudentSchema), c.updateStudent);
router.delete("/:id", c.deleteStudent);
router.patch("/:id/status", c.setStudentStatus);
router.post("/:id/reset-password", c.resetStudentPassword);
router.get("/:id/progress", c.studentProgress);

export default router;
