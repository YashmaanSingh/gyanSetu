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

export const registerStudentSchema = z
  .object({
    name: z.string().min(1, "Full name is required").max(120),
    email: emailSchema,
    phone: z
      .string()
      .regex(/^[+]?[0-9]{10,15}$/, "Enter a valid mobile number (10–15 digits)"),
    studentCode: z.string().min(2, "Student ID / enrollment number is required").max(40),
    courseId: z.string().uuid("Please select a course / class"),
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
