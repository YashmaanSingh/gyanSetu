import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { loginRateLimit } from "../middleware/rateLimit";
import { validate } from "../middleware/validate";
import * as c from "../controllers/auth.controller";
import {
  adminLoginSchema,
  studentLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../validators";

const router = Router();

router.post("/admin/login", loginRateLimit(), validate(adminLoginSchema), c.adminLogin);
router.post("/student/login", loginRateLimit(), validate(studentLoginSchema), c.studentLogin);
router.post("/refresh", c.refresh);
router.post("/logout", c.logout);
router.get("/me", requireAuth, c.me);
router.post("/forgot-password", validate(forgotPasswordSchema), c.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), c.resetPassword);
router.post("/change-password", requireAuth, validate(changePasswordSchema), c.changePassword);

export default router;
