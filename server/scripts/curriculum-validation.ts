// ===== Curriculum Validation Script =====
// Runs via: npx tsx scripts/curriculum-validation.ts
//
// Supports two modes:
//   A. Static validation WITHOUT DATABASE_URL  (no DB connection required)
//   B. Database validation WHEN DATABASE_URL exists
//
// The script exits 0 when validation passes, 1 when it fails.

// ============================================================
// Types
// ============================================================

type ValidationResult = {
  ok: boolean;
  issues: string[];
  warnings: string[];
};

// ============================================================
// Static validation (no DB required)
// ============================================================

function validateStatic(): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Import curriculum data to validate structure without DB
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CURRICULUM } = require("../src/seed/curriculum.data");

  const requiredClasses = ["LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
    "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
  const foundClasses = new Set<string>((CURRICULUM as Array<{ name: string }>).map(c => c.name));

  for (const cls of requiredClasses) {
    if (!foundClasses.has(cls)) {
      issues.push(`Missing class in curriculum data: ${cls}`);
    }
  }

  for (const cls of CURRICULUM as Array<{ name: string; subjects: Array<{ name: string; slug: string; chapters: Array<{ no: number; title: string }> }> }>) {
    if (!cls.name) issues.push("Class without a name found");
    if (!cls.subjects || cls.subjects.length === 0) {
      issues.push(`Class "${cls.name}" has no subjects`);
    }
    const subjectSlugs = new Set<string>();
    for (const subj of (cls.subjects || [])) {
      if (!subj.name) issues.push(`Subject without a name in class "${cls.name}"`);
      if (!subj.slug) issues.push(`Subject "${subj.name}" in class "${cls.name}" has no slug`);
      if (subjectSlugs.has(subj.slug)) {
        issues.push(`Duplicate subject slug "${subj.slug}" in class "${cls.name}"`);
      }
      subjectSlugs.add(subj.slug);
      if (!subj.chapters || subj.chapters.length === 0) {
        issues.push(`Subject "${subj.name}" in class "${cls.name}" has no chapters`);
      }
      const chapterNos = new Set<number>();
      for (const ch of (subj.chapters || [])) {
        if (!ch.title) issues.push(`Chapter without title in ${cls.name} / ${subj.name}`);
        if (ch.no <= 0) issues.push(`Invalid chapter number ${ch.no} in ${cls.name} / ${subj.name}`);
        if (chapterNos.has(ch.no)) {
          issues.push(`Duplicate chapter no ${ch.no} in ${cls.name} / ${subj.name}`);
        }
        chapterNos.add(ch.no);
      }
    }
  }

  if (issues.length === 0) {
    warnings.push("Static curriculum data structure: OK");
  }

  return { ok: issues.length === 0, issues, warnings };
}

// ============================================================
// Database validation (requires DATABASE_URL)
// ============================================================

async function validateDatabase(): Promise<ValidationResult> {
  const issues: string[] = [];
  const warnings: string[] = [];

  try {
    const { initDb, getDb } = await import("../src/db/index");
    await initDb();
    const db = getDb();

    const { eq, asc } = await import("drizzle-orm");
    const { classes, classSubjects, subjects, chapters, studyMaterials } = await import("../src/db/schema");

    // Check all required classes exist
    const requiredClassNames = ["LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
      "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];

    const allClassRows = await db.select().from(classes);
    const classNameSet = new Set(allClassRows.map(c => c.name));

    for (const name of requiredClassNames) {
      if (!classNameSet.has(name)) {
        issues.push(`Class "${name}" not found in database`);
      }
    }

    // Check each class has subjects
    for (const classRow of allClassRows) {
      const classSubjectRows = await db.select({ subject: subjects, cs: classSubjects })
        .from(subjects)
        .innerJoin(classSubjects, eq(classSubjects.subjectId, subjects.id))
        .where(eq(classSubjects.classId, classRow.id))
        .orderBy(asc(classSubjects.orderIndex));

      if (classSubjectRows.length === 0) {
        issues.push(`Class "${classRow.name}" has no subjects`);
        continue;
      }

      // Check each subject has chapters
      for (const row of classSubjectRows) {
        const subjectRow = row.subject;
        const chapterRows = await db.select().from(chapters)
          .where(eq(chapters.subjectId, subjectRow.id));

        if (chapterRows.length === 0) {
          issues.push(`Subject "${subjectRow.name}" in class "${classRow.name}" has no chapters`);
        }

        // Check chapters have study materials
        for (const ch of chapterRows) {
          const mats = await db.select().from(studyMaterials).where(eq(studyMaterials.chapterId, ch.id));
          if (mats.length === 0) {
            warnings.push(`Chapter "${ch.title}" (${classRow.name}/${subjectRow.name}) has no study materials`);
          }
        }
      }
    }

    // Check for duplicate class-subject mappings
    const allCSRows = await db.select().from(classSubjects);
    const csKeys = new Set<string>();
    for (const cs of allCSRows) {
      const key = `${cs.classId}:${cs.subjectId}`;
      if (csKeys.has(key)) {
        issues.push(`Duplicate class-subject mapping: classId=${cs.classId}, subjectId=${cs.subjectId}`);
      }
      csKeys.add(key);
    }

    warnings.push(`Database validation complete: ${allClassRows.length} classes, ${allCSRows.length} class-subject mappings`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    issues.push(`Database validation error: ${msg}`);
  }

  return { ok: issues.length === 0, issues, warnings };
}

// ============================================================
// Main entry point
// ============================================================

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log("DATABASE_URL not configured — running static curriculum validation only.");
    const result = validateStatic();
    result.warnings.forEach(w => console.log(`  ℹ ${w}`));
    if (result.ok) {
      console.log("Curriculum validation: PASS");
      process.exit(0);
    } else {
      console.log("Curriculum validation: FAIL");
      result.issues.forEach(i => console.log(`  ✗ ${i}`));
      process.exit(1);
    }
  } else {
    console.log("DATABASE_URL found — running database curriculum validation.");
    const result = await validateDatabase();
    result.warnings.forEach(w => console.log(`  ℹ ${w}`));
    if (result.ok) {
      console.log("Curriculum validation: PASS");
      process.exit(0);
    } else {
      console.log("Curriculum validation: FAIL");
      result.issues.forEach(i => console.log(`  ✗ ${i}`));
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error("Validator error:", err);
  process.exit(1);
});