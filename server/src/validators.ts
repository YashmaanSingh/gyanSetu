import { z } from "zod";

export const emailSchema = z.string().email("Enter a valid email");
export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(128);

export const adminLoginSchema = z.object({
  identifier: z.string().min(1, "Email is required"),
  email: z.string().optional(),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const studentLoginSchema = z.object({
  identifier: z.string().min(1, "Student ID or email is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const registerPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

export const CLASS_NAMES = [
  "LKG",
  "UKG",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
] as const;

export const registerStudentSchema = z
  .object({
    name: z.string().min(1, "Full name is required").max(120),
    email: emailSchema,
    phone: z
      .string()
      .regex(/^[+]?[0-9]{10,15}$/, "Enter a valid mobile number (10–15 digits)"),
    studentCode: z.string().min(2).max(40).optional().or(z.literal("")),
    className: z.enum(CLASS_NAMES, { error: () => "Please select a class" }),
    courseId: z.string().uuid().optional().or(z.literal("")),
    dob: z.string().optional(),
    batch: z.string().max(60).optional().or(z.literal("")),
    enrollmentDate: z.string().optional(),
    password: registerPasswordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const createStudentSchema = z.object({
  name: z.string().min(1).max(120),
  email: emailSchema,
  phone: z.string().max(30).optional().or(z.literal("")),
  studentCode: z.string().min(2).max(40),
  password: passwordSchema,
  className: z.enum(CLASS_NAMES).optional(),
  courseId: z.string().uuid().optional().or(z.literal("")),
  batch: z.string().max(60).optional().or(z.literal("")),
  guardianName: z.string().max(120).optional().or(z.literal("")),
  enrollmentDate: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  avatarFileId: z.string().uuid().optional().or(z.literal("")),
});

export const updateStudentSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: emailSchema.optional(),
  phone: z.string().max(30).optional().or(z.literal("")),
  className: z.enum(CLASS_NAMES).optional(),
  courseId: z.string().uuid().optional().or(z.literal("")),
  batch: z.string().max(60).optional().or(z.literal("")),
  guardianName: z.string().max(120).optional().or(z.literal("")),
  enrollmentDate: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  avatarFileId: z.string().uuid().optional().or(z.literal("")),
});

export const createMaterialSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().or(z.literal("")),
  type: z.enum(["note", "book", "pdf", "document", "video", "link", "assignment"]),
  subjectId: z.string().uuid().optional().or(z.literal("")),
  courseId: z.string().uuid().optional().or(z.literal("")),
  topic: z.string().max(160).optional().or(z.literal("")),
  fileId: z.string().uuid().optional().or(z.literal("")),
  externalUrl: z.string().url().optional().or(z.literal("")),
  thumbnailFileId: z.string().uuid().optional().or(z.literal("")),
  author: z.string().max(160).optional().or(z.literal("")),
  visibility: z.enum(["all", "course", "batch"]).optional(),
  batch: z.string().max(60).optional().or(z.literal("")),
  status: z.enum(["draft", "published", "archived"]).optional(),
  downloadAllowed: z.boolean().optional(),
});

export const updateMaterialSchema = createMaterialSchema.partial();

export const questionSchema = z.object({
  text: z.string().min(1),
  imageFileId: z.string().uuid().optional().or(z.literal("")),
  options: z
    .array(z.object({ key: z.string().min(1), text: z.string().min(1) }))
    .min(2)
    .max(6),
  correctKey: z.string().min(1),
  explanation: z.string().optional().or(z.literal("")),
  marks: z.number().int().min(1).max(100).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  topic: z.string().max(160).optional().or(z.literal("")),
  orderIndex: z.number().int().min(0).optional(),
});

export const createActivitySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().or(z.literal("")),
  type: z.enum(["mcq", "quiz", "reading", "assignment", "practice", "challenge"]),
  activityDate: z.string().min(1),
  startTime: z.string().optional().or(z.literal("")),
  endTime: z.string().optional().or(z.literal("")),
  subjectId: z.string().uuid().optional().or(z.literal("")),
  courseId: z.string().uuid().optional().or(z.literal("")),
  batch: z.string().max(60).optional().or(z.literal("")),
  timeLimitMinutes: z.number().int().min(1).max(600).optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).max(20).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  isDaily: z.boolean().optional(),
  questions: z.array(questionSchema).min(1, "Add at least one question").max(100),
});

export const updateActivitySchema = createActivitySchema.partial().extend({
  questions: z.array(questionSchema).min(1).max(100).optional(),
});

export const attemptSubmitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        selectedKey: z.string().max(10).nullable().optional(),
      })
    )
    .min(1),
});

export const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1),
  imageFileId: z.string().uuid().optional().or(z.literal("")),
  priority: z.enum(["normal", "important", "critical"]).optional(),
  publishDate: z.string().optional(),
  expiryDate: z.string().optional().or(z.literal("")),
  targetRole: z.enum(["all", "students", "admins"]).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

export const settingsSchema = z.object({
  platformName: z.string().max(80).optional(),
  platformTagline: z.string().max(160).optional(),
  logoFileId: z.string().uuid().optional().or(z.literal("")),
  themeColor: z.string().max(16).optional(),
  quiz: z
    .object({
      defaultTimeLimit: z.number().int().min(1).max(600).optional(),
      defaultMaxAttempts: z.number().int().min(1).max(20).optional(),
      defaultPassingScore: z.number().int().min(0).max(100).optional(),
    })
    .optional(),
  uploads: z
    .object({
      maxSizeMb: z.number().int().min(1).max(200).optional(),
      allowedExtensions: z.string().optional(),
    })
    .optional(),
  notificationsEnabled: z.boolean().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(12),
  q: z.string().optional(),
  sort: z.string().optional(),
});

// ===== Daily Tasks =====
const dailyTaskType = z.enum(["mcq", "truefalse", "oneword", "short", "qa"]);

const dailyOptionSchema = z.object({
  key: z.string().min(1),
  text: z.string().min(1),
  isCorrect: z.boolean().optional(),
});

export const dailyQuestionSchema = z
  .object({
    text: z.string().min(1, "Question text is required"),
    marks: z.number().int().min(1).max(100).optional(),
    orderIndex: z.number().int().min(0).optional(),
    // MCQ
    options: z.array(dailyOptionSchema).max(8).optional(),
    correctKey: z.string().min(1).optional(),
    // One-word
    correctAnswer: z.string().min(1).optional(),
    caseInsensitive: z.boolean().optional(),
    explanation: z.string().optional().or(z.literal("")),
  })
  .superRefine((q, ctx) => {
    if (q.options && q.options.filter((o) => o.isCorrect).length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mark exactly one option as correct (MCQ)",
        path: ["options"],
      });
    }
    if (q.correctKey && (!q.options || !q.options.some((o) => o.key === q.correctKey))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "correctKey must match one of the option keys",
        path: ["correctKey"],
      });
    }
  });

export const createDailyTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  instructions: z.string().optional().or(z.literal("")),
  type: dailyTaskType,
  classId: z.string().uuid("Select a valid class"),
  subjectId: z.string().uuid().optional().or(z.literal("")),
  chapterId: z.string().uuid().optional().or(z.literal("")),
  taskDate: z.string().min(1, "Task date is required"),
  timeLimitMinutes: z.number().int().min(0).max(600).optional(),
  allowReattempt: z.boolean().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  questions: z
    .array(dailyQuestionSchema)
    .min(1, "Add at least one question")
    .max(100),
});

export const updateDailyTaskSchema = createDailyTaskSchema.partial().extend({
  questions: z.array(dailyQuestionSchema).min(1).max(100).optional(),
});

export const dailySubmitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        selectedKey: z.string().max(20).nullable().optional(),
        responseText: z.string().max(5000).nullable().optional(),
      })
    )
    .min(1),
});

export const dailyReviewSchema = z.object({
  feedback: z.string().optional().or(z.literal("")),
  status: z.enum(["pending_review", "evaluated"]).optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        marksAwarded: z.number().int().min(0).max(100).nullable().optional(),
        isCorrect: z.boolean().nullable().optional(),
      })
    )
    .optional(),
});
