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
  materialVideoSourceEnum,
  visibilityEnum,
  materialStatusEnum,
  activityTypeEnum,
  difficultyEnum,
  attemptStatusEnum,
  priorityEnum,
  audienceEnum,
  fileKindEnum,
  classStatusEnum,
  chapterStatusEnum,
  dailyTaskTypeEnum,
  dailyTaskStatusEnum,
  dailySubmissionStatusEnum,
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
  stream: E.streamEnum("stream"),
  category: E.subjectCategoryEnum("subject_category"),
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
  className: text("class_name"),
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

// ===== Curriculum / Learning content hierarchy =====
// Class -> ClassSubject -> Subject -> Chapter -> ChapterContent / StudyMaterial (PDF via files)

export const classes = pgTable("classes", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  orderIndex: integer("order_index").notNull().default(0),
  description: text("description"),
  status: E.classStatusEnum("status").notNull().default("active"),
  curriculumSource: text("curriculum_source"),
  curriculumVersion: text("curriculum_version"),
  officialSourceUrl: text("official_source_url"),
  createdAt: ts.createdAt,
  updatedAt: ts.updatedAt,
});

export const classSubjects = pgTable(
  "class_subjects",
  {
    id: id(),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: ts.createdAt,
  },
  (t) => ({ uniq: uniqueIndex("uq_class_subject").on(t.classId, t.subjectId) })
);

export const chapters = pgTable("chapters", {
  id: id(),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  chapterNo: integer("chapter_no").notNull().default(1),
  summary: text("summary"),
  status: E.chapterStatusEnum("status").notNull().default("draft"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: ts.createdAt,
  updatedAt: ts.updatedAt,
});

export const chapterContent = pgTable("chapter_content", {
  id: id(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  intro: text("intro"),
  objectives: jsonb("objectives").$type<string[]>().default([]),
  keyPoints: jsonb("key_points").$type<string[]>().default([]),
  definitions: jsonb("definitions").$type<{ term: string; definition: string }[]>().default([]),
  examples: jsonb("examples").$type<{ question: string; solution: string }[]>().default([]),
  practiceQuestions: jsonb("practice_questions").$type<{ q: string; a: string }[]>().default([]),
  revision: text("revision"),
  body: text("body"),
  createdAt: ts.createdAt,
  updatedAt: ts.updatedAt,
});

export const studyMaterials = pgTable("study_materials", {
  id: id(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
  type: E.materialTypeEnum("type").notNull().default("pdf"),
  // Video / external link support
  videoSource: E.materialVideoSourceEnum("video_source"),
  url: text("url"),
  thumbnailFileId: uuid("thumbnail_file_id").references(() => files.id, { onDelete: "set null" }),
  durationSeconds: integer("duration_seconds"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  downloadAllowed: boolean("download_allowed").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  status: E.materialStatusEnum("status").notNull().default("published"),
  createdAt: ts.createdAt,
  updatedAt: ts.updatedAt,
});

// ===== Daily Tasks =====
// Admin-created short daily learning activities (MCQ / True-False / One-word / Short answer / Quick Q&A)
// targeted to a class (+ optional subject / chapter). Students submit once (unless reattempt allowed)
// and objective answers are auto-evaluated; subjective answers are flagged for manual review.

export const dailyTasks = pgTable("daily_tasks", {
  id: id(),
  title: text("title").notNull(),
  instructions: text("instructions"),
  type: E.dailyTaskTypeEnum("type").notNull().default("mcq"),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  className: text("class_name").notNull(),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  subjectName: text("subject_name"),
  chapterId: uuid("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
  chapterTitle: text("chapter_title"),
  taskDate: date("task_date").notNull().default(sql`current_date`),
  timeLimitMinutes: integer("time_limit_minutes").notNull().default(0),
  totalMarks: integer("total_marks").notNull().default(0),
  status: E.dailyTaskStatusEnum("status").notNull().default("draft"),
  allowReattempt: boolean("allow_reattempt").notNull().default(false),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: ts.createdAt,
  updatedAt: ts.updatedAt,
});

export const dailyTaskQuestions = pgTable(
  "daily_task_questions",
  {
    id: id(),
    taskId: uuid("task_id").notNull().references(() => dailyTasks.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    marks: integer("marks").notNull().default(1),
    orderIndex: integer("order_index").notNull().default(0),
    // MCQ / True-False
    correctKey: text("correct_key"),
    // One-word (exact answer configured)
    correctAnswer: text("correct_answer"),
    caseInsensitive: boolean("case_insensitive").notNull().default(true),
    explanation: text("explanation"),
    createdAt: ts.createdAt,
  },
  (t) => ({ taskIdx: index("idx_dt_question_task").on(t.taskId) })
);

export const dailyTaskOptions = pgTable(
  "daily_task_options",
  {
    id: id(),
    questionId: uuid("question_id").notNull().references(() => dailyTaskQuestions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (t) => ({ qIdx: index("idx_dt_option_question").on(t.questionId) })
);

export const dailyTaskSubmissions = pgTable(
  "daily_task_submissions",
  {
    id: id(),
    taskId: uuid("task_id").notNull().references(() => dailyTasks.id, { onDelete: "cascade" }),
    studentUserId: uuid("student_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    attemptNo: integer("attempt_no").notNull().default(1),
    status: E.dailySubmissionStatusEnum("status").notNull().default("submitted"),
    submittedAt: timestamp("submitted_at", { mode: "date" }).notNull().defaultNow(),
    score: integer("score"),
    totalMarks: integer("total_marks").notNull().default(0),
    percentage: numeric("percentage", { precision: 5, scale: 2, mode: "number" }),
    feedback: text("feedback"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { mode: "date" }),
    createdAt: ts.createdAt,
  },
  (t) => ({
    uniq: uniqueIndex("uq_dt_submission").on(t.taskId, t.studentUserId, t.attemptNo),
    studentIdx: index("idx_dt_submission_student").on(t.studentUserId),
  })
);

export const dailyTaskAnswers = pgTable(
  "daily_task_answers",
  {
    id: id(),
    submissionId: uuid("submission_id").notNull().references(() => dailyTaskSubmissions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => dailyTaskQuestions.id, { onDelete: "cascade" }),
    selectedKey: text("selected_key"),
    responseText: text("response_text"),
    isCorrect: boolean("is_correct"),
    autoEvaluated: boolean("auto_evaluated").notNull().default(false),
    marksAwarded: integer("marks_awarded"),
  },
  (t) => ({ subIdx: index("idx_dt_answer_submission").on(t.submissionId) })
);
