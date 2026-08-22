import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  date,
  time,
  numeric,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { QuestionOption } from "../types";
import * as E from "./enums";

export {
  roleEnum,
  userStatusEnum,
  materialTypeEnum,
  visibilityEnum,
  materialStatusEnum,
  activityTypeEnum,
  difficultyEnum,
  attemptStatusEnum,
  priorityEnum,
  audienceEnum,
  fileKindEnum,
} from "./enums";

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const ts = {
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
};

export const files = pgTable("files", {
  id: id(),
  originalName: text("original_name").notNull(),
  storedName: text("stored_name").notNull().unique(),
  mimeType: text("mime_type").notNull(),
  ext: text("ext").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  kind: E.fileKindEnum("kind").notNull(),
  uploadedBy: uuid("uploaded_by").references((): any => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const courses = pgTable("courses", {
  id: id(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const subjects = pgTable("subjects", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
  colorHex: text("color_hex").notNull().default("#4f46e5"),
  createdAt: ts.createdAt,
});

export const users = pgTable("users", {
  id: id(),
  role: E.roleEnum("role").notNull().default("student"),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarFileId: uuid("avatar_file_id").references((): any => files.id, { onDelete: "set null" }),
  status: E.userStatusEnum("status").notNull().default("active"),
  lastLoginAt: timestamp("last_login_at", { mode: "date" }),
  createdAt: ts.createdAt,
  updatedAt: ts.updatedAt,
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});

export const adminProfiles = pgTable("admin_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  phone: text("phone"),
  designation: text("designation").default("Administrator"),
  bio: text("bio"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: ts.updatedAt,
});

export const students = pgTable("students", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  studentCode: text("student_code").notNull().unique(),
  phone: text("phone"),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
  batch: text("batch"),
  guardianName: text("guardian_name"),
  dob: date("dob"),
  enrollmentDate: date("enrollment_date").notNull().default(sql`current_date`),
  address: text("address"),
  createdAt: ts.createdAt,
  updatedAt: ts.updatedAt,
});

export const sessions = pgTable("sessions", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  userAgent: text("user_agent"),
  ip: text("ip"),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  revokedAt: timestamp("revoked_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});
export const materials = pgTable("materials", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  type: E.materialTypeEnum("type").notNull().default("note"),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
  topic: text("topic"),
  fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
  externalUrl: text("external_url"),
  thumbnailFileId: uuid("thumbnail_file_id").references(() => files.id, { onDelete: "set null" }),
  author: text("author"),
  visibility: E.visibilityEnum("visibility").notNull().default("all"),
  batch: text("batch"),
  status: E.materialStatusEnum("status").notNull().default("draft"),
  downloadAllowed: boolean("download_allowed").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  publishedAt: timestamp("published_at", { mode: "date" }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  ...ts,
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});

export const materialCompletions = pgTable(
  "material_completions",
  {
    id: id(),
    materialId: uuid("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
    studentUserId: uuid("student_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ uniq: uniqueIndex("uq_material_completion").on(t.materialId, t.studentUserId) })
);

export const materialViews = pgTable(
  "material_views",
  {
    id: id(),
    materialId: uuid("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
    studentUserId: uuid("student_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ uniq: uniqueIndex("uq_material_view").on(t.materialId, t.studentUserId) })
);

export const activities = pgTable("activities", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  type: E.activityTypeEnum("type").notNull().default("mcq"),
  activityDate: date("activity_date").notNull().default(sql`current_date`),
  startTime: time("start_time"),
  endTime: time("end_time"),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
  batch: text("batch"),
  timeLimitMinutes: integer("time_limit_minutes").notNull().default(10),
  passingScore: integer("passing_score").notNull().default(50),
  maxAttempts: integer("max_attempts").notNull().default(1),
  status: E.materialStatusEnum("status").notNull().default("draft"),
  isDaily: boolean("is_daily").notNull().default(false),
  totalMarks: integer("total_marks").notNull().default(0),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  ...ts,
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});

export const questions = pgTable("questions", {
  id: id(),
  activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  imageFileId: uuid("image_file_id").references(() => files.id, { onDelete: "set null" }),
  options: jsonb("options").$type<QuestionOption[]>().notNull(),
  correctKey: text("correct_key").notNull(),
  explanation: text("explanation"),
  marks: integer("marks").notNull().default(1),
  difficulty: E.difficultyEnum("difficulty").notNull().default("medium"),
  topic: text("topic"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: ts.updatedAt,
});
export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: id(),
    activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
    studentUserId: uuid("student_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    attemptNo: integer("attempt_no").notNull().default(1),
    status: E.attemptStatusEnum("status").notNull().default("in_progress"),
    startedAt: timestamp("started_at", { mode: "date" }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { mode: "date" }),
    deadlineAt: timestamp("deadline_at", { mode: "date" }),
  score: numeric("score", { precision: 6, scale: 2, mode: "number" }),
  totalMarks: numeric("total_marks", { precision: 6, scale: 2, mode: "number" }),
  percentage: numeric("percentage", { precision: 5, scale: 2, mode: "number" }),
    correctCount: integer("correct_count"),
    wrongCount: integer("wrong_count"),
    unansweredCount: integer("unanswered_count"),
    timeTakenSeconds: integer("time_taken_seconds"),
    passed: boolean("passed"),
  },
  (t) => ({
    uniq: uniqueIndex("uq_attempt").on(t.activityId, t.studentUserId, t.attemptNo),
    studentIdx: index("idx_attempt_student").on(t.studentUserId),
    activityIdx: index("idx_attempt_activity").on(t.activityId),
  })
);

export const quizAnswers = pgTable(
  "quiz_answers",
  {
    id: id(),
    attemptId: uuid("attempt_id").notNull().references(() => quizAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    selectedKey: text("selected_key"),
    isCorrect: boolean("is_correct"),
    marksAwarded: numeric("marks_awarded", { precision: 6, scale: 2, mode: "number" }),
  },
  (t) => ({ uniq: uniqueIndex("uq_answer").on(t.attemptId, t.questionId) })
);

export const announcements = pgTable("announcements", {
  id: id(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  imageFileId: uuid("image_file_id").references(() => files.id, { onDelete: "set null" }),
  priority: E.priorityEnum("priority").notNull().default("normal"),
  publishDate: timestamp("publish_date", { mode: "date" }).notNull().defaultNow(),
  expiryDate: timestamp("expiry_date", { mode: "date" }),
  targetRole: E.audienceEnum("target_role").notNull().default("all"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: ts.createdAt,
  updatedAt: ts.updatedAt,
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    linkUrl: text("link_url"),
    entityId: text("entity_id"),
    readAt: timestamp("read_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ userIdx: index("idx_notif_user").on(t.userId, t.readAt) })
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: text("entity_id"),
  meta: jsonb("meta"),
  ip: text("ip"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const passwordResets = pgTable("password_resets", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  usedAt: timestamp("used_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});
