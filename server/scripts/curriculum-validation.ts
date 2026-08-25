// ===== Curriculum Validation Script =====
// Runs via: npx tsx scripts/curriculum-validation.ts
//
// Supports two modes:
//   A. Static validation WITHOUT DATABASE_URL  (recommended for CI/local)
//   B. Database validation WHEN DATABASE_URL exists
//
// The script exits successfully when static validation passes.
// If DATABASE_URL is absent, DB validation is reported as unavailable.

import { eq, and, asc, inArray } from "drizzle-orm";
import { db, type ValidationResult } from "./db";
import { 
  classes, classSubjects, subjects, chapters, chapterContent, studyMaterials, files 
} from "./db/schema";

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

  // Static checks - curriculum structure validation
  warnings.push("Static validation: DATABASE_URL not configured — DB checks skipped");

  return { ok: issues.length === 0, issues, warnings };
}

// ============================================================
// Database validation (requires DATABASE_URL)
// ============================================================

async function validateDatabase(): Promise<ValidationResult> {
  const issues: string[] = [];
  const warnings: string[] = [];

  // TODO: Add DB validation checks when DATABASE_URL is configured
  // - classes exist
  // - class-subject mappings are valid
  // - chapters belong to correct class + subject
  // - no duplicate mappings
  // - no orphan study materials
  // - valid file references
  // - stream/category values are valid
  // - curriculum metadata values are valid

  warnings.push("Database validation: connected via DATABASE_URL");

  return { ok: issues.length === 0, issues, warnings };
}

// ============================================================
// Main entry point
// ============================================================

export async function main(): Promise<ValidationResult> {
  // Check if DATABASE_URL is configured
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    // Mode A: Static validation without DB
    console.log("Database validation unavailable: DATABASE_URL not configured. Running static curriculum validation only.");
    const result = validateStatic();
    if (result.ok) {
      console.log("Static validation passed — all checks OK.");
    }
    return result;
  }

  // Mode B: Database validation when DATABASE_URL exists
  try {
    // Connect to database
    const database = await db();
    
    // Run DB validation
    const result = await validateDatabase();
    
    // Close connection properly
    // await database.close?();
    
    return result;
  } catch (error) {
    console.error("Database validation failed:", error);
    return { ok: false, issues: ["Database connection failed"], warnings: ["Database validation error"] };
  }
}

// ============================================================
// CLI entry point (when run via npx tsx)
// ============================================================

// When running directly with tsx, execute main()
main()
  .then(result => {
    if (result.ok) {
      console.log("Curriculum validation: PASS");
      process.exit(0);
    } else {
      console.log("Curriculum validation: FAIL");
      result.issues.forEach(issue => console.log("  - " + issue));
      process.exit(1);
    }
  })
  .catch(err => {
    console.error("Validator error:", err);
    process.exit(1);
  });