import { z } from "zod";
import { getDb } from "./db";
import { classes, classSubjects, subjects, chapters, chapterContent, studyMaterials, files } from "./db/schema";
import { eq, and, asc } from "drizzle-orm";

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

// ===== Curriculum Validation =====

export interface CurriculumValidationResult {
  overall: ValidationStatus;
  classes: ClassValidation[];
  subjects: SubjectValidation[];
  chapters: ChapterValidation[];
  materials: MaterialValidation[];
  report: string[];
}

export interface ClassValidation {
  className: string;
  exists: boolean;
  subjectCount: number;
  expectedSubjectCount: number;
  status: ValidationStatus;
  issues: string[];
}

export interface SubjectValidation {
  subjectName: string;
  className: string;
  exists: boolean;
  chapterCount: number;
  expectedChapterCount: number;
  status: ValidationStatus;
  issues: string[];
}

export interface ChapterValidation {
  className: string;
  subjectName: string;
  chapterTitle: string;
  exists: boolean;
  chapterNo: number;
  status: ValidationStatus;
  issues: string[];
}

export interface MaterialValidation {
  className: string;
  subjectName: string;
  chapterTitle: string;
  materialType: string;
  exists: boolean;
  validFileRef: boolean;
  status: ValidationStatus;
  issues: string[];
}

type ValidationStatus = 'PASS' | 'FAIL';

export async function validateCurriculum(db: any): Promise<CurriculumValidationResult> {
  const report: string[] = [];
  const results: CurriculumValidationResult = {
    overall: 'PASS' as const,
    classes: [],
    subjects: [],
    chapters: [],
    materials: [],
    report: [],
  };

  // 1. Validate all classes LKG-12 exist
  const allClasses = await getDb().select().from(classes).where(eq(classes.status, 'active'));
  const classMap = new Map<string, any>();
  for (const cls of allClasses) {
    classMap.set(cls.name.toLowerCase(), cls);
  }

  const requiredClasses = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  for (const clsName of requiredClasses) {
    const cls = classMap.get(clsName.toLowerCase());
    // Query subjects for this class directly (no innerJoin)
    const foundSubjects = await getDb().select().from(subjects).where(eq(subjects.classId, cls!.id)).orderBy(asc(subjects.orderIndex));

    const expectedSubjects = getExpectedSubjects(clsName);
    const subjectOk = foundSubjects.length === expectedSubjects;
    const issues: string[] = [];
    if (!subjectOk) issues.push(`Expected ${expectedSubjects} subjects, got ${foundSubjects.length}`);

    // Check chapter counts per subject
    for (const sub of foundSubjects) {
      const foundChapters = await getDb().select().from(chapters).where(and(eq(chapters.classId, cls!.id), eq(chapters.subjectId, sub.id))).orderBy(asc(chapters.chapterNo));
      if (foundChapters.length === 0) issues.push(`No chapters for ${sub.name}`);
    }

    const classVal: ClassValidation = {
      className: clsName,
      exists: cls !== undefined,
      subjectCount: foundSubjects.length,
      expectedSubjectCount: expectedSubjects,
      status: subjectOk ? 'PASS' : 'FAIL',
      issues,
    };
    results.classes.push(classVal);
    if (!subjectOk || issues.length > 0) report.push(`CLASS ${clsName}: ${issues.join('; ')}`);
  }

// 2. Validate subjects and chapters
  for (const clsName of requiredClasses) {
    const cls = classMap.get(clsName.toLowerCase());
    // Query subjects for this class directly (no innerJoin)
    const foundSubjects = await getDb().select().from(subjects).where(eq(subjects.classId, cls!.id)).orderBy(asc(subjects.orderIndex));

    for (const sub of foundSubjects) {
      const foundChapters = await getDb().select().from(chapters).where(and(eq(chapters.classId, cls!.id), eq(chapters.subjectId, sub.id))).orderBy(asc(chapters.chapterNo));

      for (const ch of foundChapters) {
        const content = await getDb().query.chapterContent.findFirst({
          where: eq(chapterContent.chapterId, ch.id),
        });
        const mats = await getDb().select().from(studyMaterials).where(eq(studyMaterials.chapterId, ch.id));

        const hasContent = content !== null;
        const hasMaterials = mats.length > 0;
        const chapterNoValid = ch.chapterNo > 0;

        const issues: string[] = [];
        if (!hasContent) issues.push('Missing chapter content');
        if (!hasMaterials) issues.push('No study materials for this chapter');
        if (!chapterNoValid) issues.push('Invalid chapter number');

        const subjVal: SubjectValidation = {
          subjectName: sub.name,
          className: clsName,
          exists: true,
          chapterCount: foundSubjects.length,
          expectedChapterCount: getExpectedChapters(clsName, sub.name),
          status: (hasContent && hasMaterials && chapterNoValid) ? 'PASS' : 'FAIL',
          issues,
        };
        results.subjects.push(subjVal);

        for (const ch of foundChapters) {
          const chMats = await getDb().select().from(studyMaterials).where(eq(studyMaterials.chapterId, ch.id));
          const chContent = await getDb().query.chapterContent.findFirst({
            where: eq(chapterContent.chapterId, ch.id),
          });
          const chVal: ChapterValidation = {
            className: clsName,
            subjectName: sub.name,
            chapterTitle: ch.title,
            exists: true,
            chapterNo: ch.chapterNo,
            status: (chContent && chMats.length > 0) ? 'PASS' : 'FAIL',
            issues: [],
          };
          results.chapters.push(chVal);
          if (chVal.status === 'FAIL') {
            report.push(`CHAPTER ${clsName} → ${sub.name} → ${ch.title}: ${chVal.issues.join(', ')}`);
          }
        }
      }
    }
  }

  // 3. Validate materials
  const allMats = await getDb().select().from(studyMaterials);
  for (const mat of allMats) {
    const ch = await getDb().query.chapters.findFirst({ where: eq(chapters.id, mat.chapterId!) });
    const sub = await getDb().query.subjects.findFirst({ where: eq(subjects.id, ch!.subjectId) });
    const cls = await getDb().query.classes.findFirst({ where: eq(classes.id, ch!.classId) });

    const file = mat.fileId ? await getDb().query.files.findFirst({ where: eq(files.id, mat.fileId) }) : null;

    const issues: string[] = [];
    if (!ch) issues.push('Chapter not found');
    if (!sub) issues.push('Subject not found');
    if (!cls) issues.push('Class not found');
    if (mat.fileId && !file) issues.push('Invalid file reference');
    if (!mat.title) issues.push('Missing material title');

    const matVal: MaterialValidation = {
      className: cls?.name || 'Unknown',
      subjectName: sub?.name || 'Unknown',
      chapterTitle: ch?.title || 'Unknown',
      materialType: mat.type,
      exists: true,
      validFileRef: mat.fileId ? !!file : true,
      status: (ch && sub && cls && (mat.fileId ? !!file : true) && mat.title) ? 'PASS' : 'FAIL',
      issues,
    };
    results.materials.push(matVal);
    if (matVal.status === 'FAIL') {
      report.push(`MATERIAL ${cls?.name} → ${sub?.name} → ${ch?.title} (${mat.type}): ${matVal.issues.join(', ')}`);
    }
  }

  // 4. Overall status
  const allPass =
    results.classes.every(c => c.status === 'PASS') &&
    results.subjects.every(s => s.status === 'PASS') &&
    results.chapters.every(ch => ch.status === 'PASS') &&
    results.materials.every(m => m.status === 'PASS');

  results.overall = allPass ? 'PASS' : 'FAIL';

  return results;
}

function getExpectedSubjects(className: string): number {
  const map: Record<string, number> = {
    LKG: 3, UKG: 3, 1: 4, 2: 4, 3: 4, 4: 4, 5: 4,
    6: 6, 7: 6, 8: 6, 9: 6, 10: 6,
    11: 9, 12: 9,
  };
  return map[className] || 0;
}

function getExpectedChapters(className: string, subjectName: string): number {
  const map: Record<string, Record<string, number>> = {
    LKG: { 'English (Foundational)': 5, 'Hindi (Foundational)': 6, 'Mathematics (Foundational)': 6, 'General Awareness / EVS': 6 },
    UKG: { 'English (Foundational)': 5, 'Hindi (Foundational)': 6, 'Mathematics (Foundational)': 6 },
    1: { English: 7, Hindi: 7, Mathematics: 11, EVS: 7 },
    2: { English: 6, Hindi: 6, Mathematics: 12, EVS: 7 },
    3: { English: 6, Hindi: 6, Mathematics: 14, EVS: 10 },
    4: { English: 6, Hindi: 6, Mathematics: 14, EVS: 10 },
    5: { English: 6, Hindi: 6, Mathematics: 13, EVS: 11 },
    6: { English: 10, Hindi: 7, Mathematics: 14, Science: 16, SocialScience: 16, Sanskrit: 6 },
    7: { English: 8, Hindi: 6, Mathematics: 18, Science: 18, SocialScience: 18, Sanskrit: 6 },
    8: { English: 10, Hindi: 6, Mathematics: 16, Science: 18, SocialScience: 16, Sanskrit: 6 },
    9: { English: 10, Hindi: 6, Mathematics: 15, Science: 15, SocialScience: 15, Sanskrit: 6 },
    10: { English: 11, Hindi: 6, Mathematics: 14, Science: 16, SocialScience: 16, Sanskrit: 6 },
    11: { 'English Core': 8, Mathematics: 16, Physics: 15, Chemistry: 14, Biology: 14, ComputerScience: 8, Accountancy: 8, BusinessStudies: 8, Economics: 10, PoliticalScience: 8, History: 8, Geography: 8, Sanskrit: 6 },
    12: { 'English Core': 8, Mathematics: 13, Physics: 15, Chemistry: 16, Biology: 16, ComputerScience: 8, Accountancy: 8, BusinessStudies: 8, Economics: 12, PoliticalScience: 8, History: 8, Geography: 8, Sanskrit: 6 },
  };
  return map[className]?.[subjectName] || 0;
}
