import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as c from "../controllers/announcements.controller";
import { announcementSchema } from "../validators";

const router = Router();

router.use(requireAuth);

router.get("/", c.listAnnouncements);
router.get("/:id", c.getAnnouncement);
router.post("/", requireAdmin, validate(announcementSchema), c.createAnnouncement);
router.put("/:id", requireAdmin, validate(announcementSchema), c.updateAnnouncement);
router.delete("/:id", requireAdmin, c.deleteAnnouncement);

export default router;
