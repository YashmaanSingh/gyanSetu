import { Request, Response } from "express";
import { and, desc, eq, isNull, like, or, sql, count } from "drizzle-orm";
import { getDb } from "../db";
import {
  users,
  students,
  courses,
  sessions,
} from "../db/schema";
import { ApiError } from "../utils/errors";
import { comparePassword, hashPassword } from "../utils/password";
import {
  createStudentSchema,
  updateStudentSchema,
  paginationSchema,
  registerStudentSchema,
} from "../validators";
import { issueTokensAsync, loadProfile } from "./auth.controller";
import { computeStudentProgress } from "../utils/analytics";
import { buildPagination } from "../utils/helpers";

function serialize(row: any) {
  return {
    id: row.u.id,
    name: row.u.name,
    email: row.u.email,
    role: row.u.role,
    status: row.u.status,
    avatarFileId: row.u.avatarFileId,
    studentCode: row.s?.studentCode ?? null,
    phone: row.s?.phone ?? null,
    className: row.s?.className ?? null,
    courseId: row.s?.courseId ?? null,
    courseName: row.c?.name ?? null,
    batch: row.s?.batch ?? null,
    guardianName: row.s?.guardianName ?? null,
    enrollmentDate: row.s?.enrollmentDate ?? null,
    createdAt: row.u.createdAt,
  };
}

export async function registerStudent(req: Request, res: Response) {
  const data = registerStudentSchema.parse(req.body);
  const db = getDb();
  const email = data.email.toLowerCase().trim();

  const [byEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)));
  if (byEmail) throw ApiError.conflict("Email already in use");

  let studentCode = (data.studentCode || "").trim();
  if (!studentCode) {
    studentCode = "GS-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  } else {
    const [byCode] = await db
      .select({ id: students.userId })
      .from(students)
      .where(eq(students.studentCode, studentCode));
    if (byCode) throw ApiError.conflict("Student ID already in use");
  }

  const hash = await hashPassword(data.password);
  const userId = (
    await db
      .insert(users)
      .values({
        name: data.name.trim(),
        email,
        passwordHash: hash,
        role: "student",
        status: "active",
      })
      .returning({ id: users.id })
  )[0].id;

  await db.insert(students).values({
    userId,
    studentCode,
    phone: data.phone || null,
    className: data.className || null,
    courseId: data.courseId || null,
    batch: data.batch || null,
    dob: data.dob ? data.dob : undefined,
    enrollmentDate: data.enrollmentDate ? data.enrollmentDate : undefined,
  });

  const [row] = await db
    .select({ u: users, s: students, c: courses })
    .from(users)
    .leftJoin(students, eq(students.userId, users.id))
    .leftJoin(courses, eq(students.courseId, courses.id))
    .where(eq(users.id, userId));

  const accessToken = await issueTokensAsync(res, row.u, false);
  res.status(201).json({ accessToken, user: await loadProfile(row.u.id) });
}

export async function listStudents(req: Request, res: Response) {
  const { page, pageSize, q, sort } = paginationSchema.parse(req.query);
  const db = getDb();
  const conditions = [
    eq(users.role, "student"),
    isNull(users.deletedAt),
  ];
  if (q) {
    conditions.push(
      or(
        like(users.name, `%${q}%`),
        like(users.email, `%${q}%`),
        sql`exists (select 1 from ${students} s where s.user_id = ${users.id} and s.student_code ilike ${`%${q}%`})`
      ) as any
    );
  }
  const where = and(...(conditions.filter(Boolean) as any));

  const [{ total }] = await db
    .select({ total: count() })
    .from(users)
    .leftJoin(students, eq(students.userId, users.id))
    .where(where);

  const orderExpr =
    sort === "name"
      ? users.name
      : sort === "code"
      ? students.studentCode
      : sort === "newest"
      ? desc(users.createdAt)
      : desc(users.createdAt);

  const rows = await db
    .select({ u: users, s: students, c: courses })
    .from(users)
    .leftJoin(students, eq(students.userId, users.id))
    .leftJoin(courses, eq(students.courseId, courses.id))
    .where(where)
    .orderBy(orderExpr)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  res.json({
    students: rows.map(serialize),
    pagination: buildPagination(Number(total), page, pageSize),
  });
}

export async function getStudent(req: Request, res: Response) {
  const db = getDb();
  const [row] = await db
    .select({ u: users, s: students, c: courses })
    .from(users)
    .leftJoin(students, eq(students.userId, users.id))
    .leftJoin(courses, eq(students.courseId, courses.id))
    .where(and(eq(users.id, String(req.params.id)), isNull(users.deletedAt)))
    .limit(1);
  if (!row || row.u.role !== "student") throw ApiError.notFound("Student not found");
  res.json({ student: serialize(row) });
}

export async function createStudent(req: Request, res: Response) {
  const data = createStudentSchema.parse(req.body);
  const db = getDb();
  const email = data.email.toLowerCase().trim();
  const [byEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)));
  if (byEmail) throw ApiError.conflict("Email already in use");
  const [byCode] = await db
    .select({ id: students.userId })
    .from(students)
    .where(eq(students.studentCode, data.studentCode.trim()));
  if (byCode) throw ApiError.conflict("Student ID already in use");

  const hash = await hashPassword(data.password);
  const userId = (await db.insert(users).values({ name: data.name.trim(), email, passwordHash: hash, role: "student", status: data.status ?? "active" }).returning({ id: users.id }))[0].id;

  await db.insert(students).values({
    userId,
    studentCode: data.studentCode.trim(),
    phone: data.phone || null,
    className: data.className || null,
    courseId: data.courseId || null,
    batch: data.batch || null,
    guardianName: data.guardianName || null,
      enrollmentDate: data.enrollmentDate ? data.enrollmentDate : undefined,
  });

  const [row] = await db
    .select({ u: users, s: students, c: courses })
    .from(users)
    .leftJoin(students, eq(students.userId, users.id))
    .leftJoin(courses, eq(students.courseId, courses.id))
    .where(eq(users.id, userId));
  res.status(201).json({ student: serialize(row) });
}

export async function updateStudent(req: Request, res: Response) {
  const data = updateStudentSchema.parse(req.body);
  const db = getDb();
  const [existing] = await db
    .select({ u: users, s: students })
    .from(users)
    .leftJoin(students, eq(students.userId, users.id))
    .where(and(eq(users.id, String(req.params.id)), isNull(users.deletedAt)));
  if (!existing || existing.u.role !== "student") throw ApiError.notFound("Student not found");

  await db
    .update(users)
    .set({
      name: data.name ?? existing.u.name,
      email: data.email ? data.email.toLowerCase().trim() : existing.u.email,
      status: data.status ?? existing.u.status,
      updatedAt: new Date(),
    })
    .where(eq(users.id, existing.u.id));

  await db
    .update(students)
    .set({
      phone: data.phone ?? existing.s?.phone ?? null,
      className: data.className ?? existing.s?.className ?? null,
      courseId: data.courseId ?? existing.s?.courseId ?? null,
      batch: data.batch ?? existing.s?.batch ?? null,
      guardianName: data.guardianName ?? existing.s?.guardianName ?? null,
      enrollmentDate: data.enrollmentDate ? data.enrollmentDate : existing.s?.enrollmentDate,
      updatedAt: new Date(),
    })
    .where(eq(students.userId, existing.u.id));

  const [row] = await db
    .select({ u: users, s: students, c: courses })
    .from(users)
    .leftJoin(students, eq(students.userId, users.id))
    .leftJoin(courses, eq(students.courseId, courses.id))
    .where(eq(users.id, existing.u.id));
  res.json({ student: serialize(row) });
}

export async function deleteStudent(req: Request, res: Response) {
  const db = getDb();
  const [existing] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(and(eq(users.id, String(req.params.id)), isNull(users.deletedAt)));
  if (!existing || existing.role !== "student") throw ApiError.notFound("Student not found");
  // Soft delete
  await db.update(users).set({ deletedAt: new Date(), status: "inactive" }).where(eq(users.id, existing.id));
  await db.delete(sessions).where(eq(sessions.userId, existing.id));
  res.json({ success: true });
}

export async function setStudentStatus(req: Request, res: Response) {
  const status = (req.body?.status as "active" | "inactive") ?? undefined;
  if (status !== "active" && status !== "inactive") throw ApiError.badRequest("Invalid status");
  const db = getDb();
  await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, String(req.params.id)));
  res.json({ success: true, status });
}

export async function resetStudentPassword(req: Request, res: Response) {
  const db = getDb();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, String(req.params.id)), isNull(users.deletedAt)));
  if (!existing) throw ApiError.notFound("Student not found");
  const newPassword = Math.random().toString(36).slice(-10) + "A1!";
  const hash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash: hash }).where(eq(users.id, existing.id));
  await db.delete(sessions).where(eq(sessions.userId, existing.id));
  res.json({ success: true, temporaryPassword: newPassword });
}

export async function studentProgress(req: Request, res: Response) {
  const db = getDb();
  const [existing] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(and(eq(users.id, String(req.params.id)), isNull(users.deletedAt)));
  if (!existing || existing.role !== "student") throw ApiError.notFound("Student not found");
  const progress = await computeStudentProgress(existing.id);
  res.json({ progress });
}

export async function myProgress(req: Request, res: Response) {
  const userId = (req as any).user.id;
  const progress = await computeStudentProgress(userId);
  res.json({ progress });
}
