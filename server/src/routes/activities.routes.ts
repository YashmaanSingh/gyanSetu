import { Router } from "express";
import { requireAdmin, requireStudent, requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as c from "../controllers/activities.controller";
import { createActivitySchema, updateActivitySchema } from "../validators";

const router = Router();

router.use(requireAuth);

router.get("/today", requireStudent, c.getToday);
router.get("/", c.listActivities);
router.get("/:id", c.getActivity);
router.post("/", requireAdmin, validate(createActivitySchema), c.createActivity);
router.put("/:id", requireAdmin, validate(updateActivitySchema), c.updateActivity);
router.patch("/:id/status", requireAdmin, c.patchActivityStatus);
router.delete("/:id", requireAdmin, c.deleteActivity);

export default router;
