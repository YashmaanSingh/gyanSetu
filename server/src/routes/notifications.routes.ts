import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as c from "../controllers/notifications.controller";

const router = Router();

router.use(requireAuth);

router.get("/", c.listNotifications);
router.get("/unread-count", c.unreadCount);
router.put("/read-all", c.markAllRead);
router.put("/:id/read", c.markRead);

export default router;
