// ===== Curriculum Validation Script =====
// This script validates the complete curriculum data integrity.
// Run with: npx tsx src/curriculum-validation.ts

import { getDb, schema } from "./db";
import { classes, classSubjects, subjects, chapters, chapterContent, studyMaterials, files } from "./db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ClassValidation {
  className: string;
  exists: boolean;
  subjectCount: number;
  expectedSubjectCount: number;
  chapterCountBySubject: Record<string, number>;
  status: 'PASS' | 'FAIL';
  issues: string[];
}

export interface SubjectValidation {
  className: string;
  subjectName: string;
  exists: boolean;
  chapterCount: number;
  expectedChapterCount: number;
  status: 'PASS' | 'FAIL';
  issues: string[];
}

export interface ChapterValidation {
  className: string;
  subjectName: string;
  chapterTitle: string;
  chapterNo: number;
  exists: boolean;
  hasContent: boolean;
  hasMaterials: boolean;
  validFileRef: boolean;
  status: 'PASS' | 'FAIL';
  issues: string[];
}

export interface MaterialValidation {
  className: string;
  subjectName: string;
  chapterTitle: string;
  materialType: string;
  exists: boolean;
  validFileRef: boolean;
  status: 'PASS' | 'FAIL';
  issues: string[];
}

export interface ValidationReport {
  overall: 'PASS' | 'FAIL';
  classes: ClassValidation[];
  subjects: SubjectValidation[];
  chapters: ChapterValidation[];
  materials: MaterialValidation[];
  summary: string;
}

// Expected curriculum structure per class
const EXPECTED_SUBJECTS: Record<string, number> = {
  LKG: 3, UKG: 3, 1: 4, 2: 4, 3: 4, 4: 4, 5: 4,
  6: 6, 7: 6, 8: 6, 9: 6, 10: 6,
  11: 9, 12: 9,
};

const EXPECTED_CHAPTERS: Record<string, Record<string, number>> = {
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

// Curriculum source/version labels
const CURRICULUM_LABELS: Record<string, string> = {
  LKG: 'Foundational / Pre-primary Curriculum',
  UKG: 'Foundational / Pre-primary Curriculum',
  1: 'NCERT-aligned / CBSE-school Curriculum',
  2: 'NCERT-aligned / CBSE-school Curriculum',
  3: 'NCERT-aligned / CBSE-school Curriculum',
  4: 'NCERT-aligned / CBSE-school Curriculum',
  5: 'NCERT-aligned / CBSE-school Curriculum',
  6: 'NCERT-aligned / CBSE-school Curriculum',
  7: 'NCERT-aligned / CBSE-school Curriculum',
  8: 'NCERT-aligned / CBSE-school Curriculum',
  9: 'CBSE Curriculum 2026–27',
  10: 'CBSE Curriculum 2026–27',
  11: 'CBSE Curriculum 2026–27',
  12: 'CBSE Curriculum 2026–27',
};

export async function validateCurriculum(): Promise<ValidationReport> {
  console.log('=== Curriculum Validation Starting ===');
  
  // Initialize database connection
  let database;
  try {
    database = await getDb();
  } catch (err) {
    console.error('Database initialization failed: ', err);
    // Continue with validation using schema only if DB not available
    database = null;
  }
  const report: ValidationReport = {
    overall: 'PASS' as const,
    classes: [],
    subjects: [],
    chapters: [],
    materials: [],
    summary: '',
  };

  try {
    // 1. Get all active classes
    const allClasses = database ? await database.select().from(classes).where(eq(classes.status, 'active')) : [];
    const classMap = new Map<string, any>();
    for (const cls of allClasses) {
      classMap.set(cls.name, cls);
    }

    // 2. Validate each class LKG-12
    const requiredClasses = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const classValidations: ClassValidation[] = [];

    for (const clsName of requiredClasses) {
      const cls = classMap.get(clsName);
      let subjectCount = 0;
      const chapterCountBySubject: Record<string, number> = {};

      if (cls) {
        // Get subjects for this class via class_subjects
        const classSubs = database ? await database.select({
          subjectId: classSubjects.subjectId,
        }).from(classSubjects).where(eq(classSubjects.classId, cls.id)) : [];

        const subjectIds = classSubs.map(cs => cs.subjectId);
        const subs = await database.select().from(subjects).where(inArray(subjects.id, subjectIds));

        subjectCount = subs.length;
        
        for (const sub of subs) {
          const chapters = await database.select().from(chapters)
            .where(and(eq(chapters.classId, cls.id), eq(chapters.subjectId, sub.id)))
            .orderBy(asc(chapters.chapterNo));

          chapterCountBySubject[sub.name] = chapters.length;
        }
      }

      const expectedSubjects = EXPECTED_SUBJECTS[clsName] || 0;
      const subjectOk = cls && subjectCount === expectedSubjects;
      const issues: string[] = [];

      if (!cls) issues.push(`Class ${clsName} not found in database`);
      if (subjectCount !== expectedSubjects) issues.push(`Expected ${expectedSubjects} subjects, got ${subjectCount}`);

      // Check for missing expected subjects
      if (cls) {
        const actualSubjectNames = chapterCountBySubject ? Object.keys(chapterCountBySubject) : [];
        const expectedSubjectNames = getExpectedSubjectNames(clsName);
        for (const expected of expectedSubjectNames) {
          if (!actualSubjectNames.includes(expected)) {
            issues.push(`Missing expected subject: ${expected}`);
          }
        }
      }

      classValidations.push({
        className: clsName,
        exists: cls !== undefined,
        subjectCount,
        expectedSubjectCount: expectedSubjects,
        chapterCountBySubject,
        status: subjectOk && issues.length === 0 ? 'PASS' : 'FAIL',
        issues,
      });
    }

    // 3. Validate subjects and chapters per class
    const subjectValidations: SubjectValidation[] = [];

    for (const clsName of requiredClasses) {
      const cls = classMap.get(clsName);
      if (!cls) continue;

      const classSubs = await database.select({
        subjectId: classSubjects.subjectId,
      }).from(classSubjects).where(eq(classSubjects.classId, cls.id));

      const subjectIds = classSubs.map(cs => cs.subjectId);
      const subs = await database.select().from(subjects).where(inArray(subjects.id, subjectIds));

      for (const sub of subs) {
        const chapters = await database.select().from(chapters)
          .where(and(eq(chapters.classId, cls.id), eq(chapters.subjectId, sub.id)))
            .orderBy(asc(chapters.chapterNo));

        const expectedChapters = getExpectedChapters(clsName, sub.name);
        const chapterOk = chapters.length === expectedChapters;
        const issues: string[] = [];

        if (chapters.length === 0) issues.push(`No chapters found for ${sub.name}`);
        if (chapters.length !== expectedChapters) issues.push(`Expected ${expectedChapters} chapters, got ${chapters.length}`);

        // Check chapter ordering and content
        for (const ch of chapters) {
          const content = await database.query.chapterContent.findFirst({
            where: eq(chapterContent.chapterId, ch.id),
          });
          const mats = await database.select().from(studyMaterials).where(eq(studyMaterials.chapterId, ch.id));

          const hasContent = content !== null;
          const hasMaterials = mats.length > 0;
          const chapterNoValid = ch.chapterNo > 0;

          const chIssues: string[] = [];
          if (!hasContent) chIssues.push('Missing chapter content');
          if (!hasMaterials) chIssues.push('No study materials for this chapter');
          if (!chapterNoValid) chIssues.push('Invalid chapter number');

          if (chIssues.length > 0) issues.push(`Chapter ${ch.chapterNo}: ${chIssues.join(', ')}`);

          // Validate each material under this chapter
          for (const mat of mats) {
            const file = mat.fileId ? await database.query.files.findFirst({ where: eq(files.id, mat.fileId) }) : null;
            const chIssues: string[] = [];
            if (mat.fileId && !file) chIssues.push('Invalid file reference');
            if (!mat.title) chIssues.push('Missing material title');

            if (chIssues.length > 0) issues.push(`Material (${mat.type}): ${chIssues.join(', ')}`);
          }
        }

        subjectValidations.push({
          className: clsName,
          subjectName: sub.name,
          exists: true,
          chapterCount: chapters.length,
          expectedChapterCount: getExpectedChapters(clsName, sub.name),
          status: (chapters.length > 0 && issues.length === 0) ? 'PASS' : 'FAIL',
          issues,
        });
      }
    }

    // 4. Validate materials
    const allMats = await database.select().from(studyMaterials);
    const materialValidations: MaterialValidation[] = [];

    for (const mat of allMats) {
      const ch = await database.query.chapters.findFirst({ where: eq(chapters.id, mat.chapterId!) });
      const sub = ch ? await database.query.subjects.findFirst({ where: eq(subjects.id, ch.subjectId) }) : null;
      const cls = ch ? await database.query.classes.findFirst({ where: eq(classes.id, ch.classId) }) : null;

      const file = mat.fileId ? await database.query.files.findFirst({ where: eq(files.id, mat.fileId) }) : null;

      const issues: string[] = [];
      if (!ch) issues.push('Chapter not found');
      if (!sub) issues.push('Subject not found');
      if (!cls) issues.push('Class not found');
      if (mat.fileId && !file) issues.push('Invalid file reference');
      if (!mat.title) issues.push('Missing material title');

      materialValidations.push({
        className: cls?.name || 'Unknown',
        subjectName: sub?.name || 'Unknown',
        chapterTitle: ch?.title || 'Unknown',
        materialType: mat.type,
        exists: true,
        validFileRef: mat.fileId ? !!file : true,
        status: (ch && sub && cls && (mat.fileId ? !!file : true) && mat.title) ? 'PASS' : 'FAIL',
        issues,
      });
    }

    // 5. Overall status
    const allClassesPass = classValidations.every(c => c.status === 'PASS');
    const allSubjectsPass = subjectValidations.every(s => s.status === 'PASS');
    const allMaterialsPass = materialValidations.every(m => m.status === 'PASS');
    const overall = (allClassesPass && allSubjectsPass && allMaterialsPass) ? 'PASS' : 'FAIL';

    // Build summary
    const summary = `
Curriculum Validation Summary:
============================
Overall: ${overall}

Classes:
${classValidations.map(c => `  - ${c.className}: ${c.status} (${c.subjectCount}/${c.expectedSubjectCount} subjects`).join('\n')}

Subjects:
${subjectValidations.map(s => `  - ${s.className} → ${s.subjectName}: ${s.status} (${s.chapterCount}/${s.expectedChapterCount} chapters`).join('\n')}

Materials:
${materialValidations.length} materials validated.

`.trim();

    report.overall = overall;
    report.classes = classValidations;
    report.subjects = subjectValidations;
    report.chapters = []; // chapters validated per subject above
    report.materials = materialValidations;
    report.summary = summary;

    console.log(report.summary);
    console.log('=== Validation Complete ===');

    return report;

  } catch (error) {
    console.error('Validation error:', error);
    report.overall = 'FAIL';
    report.summary = `Validation failed with error: ${error instanceof Error ? error.message : String(error)}`;
    return report;
  }
}

// Helper: get expected subject names for a class
function getExpectedSubjectNames(className: string): string[] {
  const maps: Record<string, string[]> = {
    LKG: ['English (Foundational)', 'Hindi (Foundational)', 'Mathematics (Foundational)'],
    UKG: ['English (Foundational)', 'Hindi (Foundational)', 'Mathematics (Foundational)'],
    1: ['English', 'Hindi', 'Mathematics', 'EVS (Environmental Studies)'],
    2: ['English', 'Hindi', 'Mathematics', 'EVS (Environmental Studies)'],
    3: ['English', 'Hindi', 'Mathematics', 'EVS (Environmental Studies)'],
    4: ['English', 'Hindi', 'Mathematics', 'EVS (Environmental Studies)'],
    5: ['English', 'Hindi', 'Mathematics', 'EVS (Environmental Studies)'],
    6: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Sanskrit'],
    7: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Sanskrit'],
    8: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Sanskrit'],
    9: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Sanskrit'],
    10: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Sanskrit'],
    11: ['English Core', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Accountancy', 'Business Studies', 'Economics', 'Political Science', 'History', 'Geography', 'Sanskrit'],
    12: ['English Core', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Accountancy', 'Business Studies', 'Economics', 'Political Science', 'History', 'Geography', 'Sanskrit'],
  };
  return maps[className] || [];
}

export default validateCurriculum;