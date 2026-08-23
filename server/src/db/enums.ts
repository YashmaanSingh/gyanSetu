import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "student"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive"]);
export const materialTypeEnum = pgEnum("material_type", [
  "note",
  "book",
  "pdf",
  "document",
  "video",
  "link",
  "assignment",
]);
export const visibilityEnum = pgEnum("visibility", ["all", "course", "batch"]);
export const materialStatusEnum = pgEnum("material_status", [
  "draft",
  "published",
  "archived",
]);
export const materialVideoSourceEnum = pgEnum("material_video_source", [
  "upload",
  "url",
]);
export const activityTypeEnum = pgEnum("activity_type", [
  "mcq",
  "quiz",
  "reading",
  "assignment",
  "practice",
  "challenge",
]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const attemptStatusEnum = pgEnum("attempt_status", [
  "in_progress",
  "submitted",
  "expired",
]);
export const priorityEnum = pgEnum("priority", ["normal", "important", "critical"]);
export const audienceEnum = pgEnum("audience", ["all", "students", "admins"]);
export const fileKindEnum = pgEnum("file_kind", [
  "pdf",
  "image",
  "doc",
  "video",
  "audio",
  "other",
]);
export const classStatusEnum = pgEnum("class_status", ["active", "inactive", "archived"]);
export const chapterStatusEnum = pgEnum("chapter_status", ["draft", "published", "archived"]);
export const dailyTaskTypeEnum = pgEnum("daily_task_type", [
  "mcq",
  "truefalse",
  "oneword",
  "short",
  "qa",
]);
export const dailyTaskStatusEnum = pgEnum("daily_task_status", [
  "draft",
  "published",
  "archived",
]);
export const dailySubmissionStatusEnum = pgEnum("daily_submission_status", [
  "submitted",
  "pending_review",
  "evaluated",
]);
export const streamEnum = pgEnum("stream", ["Science", "Commerce", "Humanities"]);
export const subjectCategoryEnum = pgEnum("subject_category", [
  "Language",
  "Core",
  "Elective",
  "Additional",
  "Skill",
]);