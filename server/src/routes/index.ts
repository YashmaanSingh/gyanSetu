import { Express } from "express";
import authRoutes from "./auth.routes";
import studentRoutes from "./students.routes";
import materialRoutes from "./materials.routes";
import activityRoutes from "./activities.routes";
import quizRoutes from "./quizzes.routes";
import announcementRoutes from "./announcements.routes";
import notificationRoutes from "./notifications.routes";
import adminRoutes from "./admin.routes";
import metaRoutes from "./meta.routes";
import searchRoutes from "./search.routes";
import fileRoutes from "./files.routes";

export function mountRoutes(app: Express) {
  app.use("/api/auth", authRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/materials", materialRoutes);
  app.use("/api/activities", activityRoutes);
  app.use("/api/quizzes", quizRoutes);
  app.use("/api/announcements", announcementRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/meta", metaRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/api", fileRoutes);
}
