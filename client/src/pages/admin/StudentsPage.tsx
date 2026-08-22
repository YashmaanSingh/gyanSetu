import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge, LoadingScreen, ErrorState, Pagination, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { Plus, Pencil, Trash2, RotateCw, Search, UserX, UserCheck } from "lucide-react";
import { fmtDate } from "@/lib/format";
import type { Student } from "@/lib/types";

export default function StudentsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Student | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["students", page, q],
    queryFn: () =>
      api.get<{ students: Student[]; pagination: any }>("/students", { page, pageSize: 12, q }),
  });
  const coursesQ = useQuery({ queryKey: ["courses"], queryFn: () => api.get<{ courses: any[] }>("/meta/courses") });

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(s: Student) {
    setEditing(s);
    setOpen(true);
  }

  async function mutateStatus(s: Student, status: string) {
    try {
      await api.patch(`/students/${s.id}/status`, { status });
      toast("Status updated", "success");
      qc.invalidateQueries({ queryKey: ["students"] });
    } catch (e: any) {
      toast(e.message, "error");
    }
  }
  async function resetPwd(s: Student) {
    try {
      const r = await api.post<{ temporaryPassword?: string }>(`/students/${s.id}/reset-password`, {});
      toast(r.temporaryPassword ? `Temp password: ${r.temporaryPassword}` : "Password reset link sent", "success");
    } catch (e: any) {
      toast(e.message, "error");
    }
  }
  async function remove(s: Student) {
    if (!confirm(`Delete ${s.name}?`)) return;
    try {
      await api.del(`/students/${s.id}`);
      toast("Student deleted", "success");
      qc.invalidateQueries({ queryKey: ["students"] });
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorState message="Failed to load students" onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Students</h1>
          <p className="text-sm text-slate-500">{data?.pagination.total} total</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search name, email, student ID…"
          className="pl-9"
        />
      </div>

      {data?.students.length === 0 ? (
        <Card>
          <EmptyState title="No students found" description="Add a student to get started." />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data?.students.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.studentCode}</p>
                </div>
                <Badge tone={s.status === "active" ? "emerald" : "slate"}>{s.status}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">{s.email}</p>
              <p className="text-xs text-slate-400 mt-1">
                {s.courseName || "No course"} · {s.batch || "—"} · {fmtDate(s.enrollmentDate, false)}
              </p>
              <div className="flex gap-1 mt-3 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => mutateStatus(s, s.status === "active" ? "inactive" : "active")}
                >
                  {s.status === "active" ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => resetPwd(s)}>
                  <RotateCw className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => remove(s)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={setPage} />

      {open && (
        <StudentForm
          student={editing}
          courses={coursesQ.data?.courses ?? []}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["students"] });
          }}
        />
      )}
    </div>
  );
}

function StudentForm({
  student,
  courses,
  onClose,
  onDone,
}: {
  student: Student | null;
  courses: any[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: student?.name ?? "",
    email: student?.email ?? "",
    studentCode: student?.studentCode ?? "",
    password: "",
    courseId: student?.courseId ?? "",
    batch: student?.batch ?? "",
    guardianName: student?.guardianName ?? "",
    enrollmentDate: student?.enrollmentDate ?? "",
    status: student?.status ?? "active",
    phone: student?.phone ?? "",
  });
  const [busy, setBusy] = useState(false);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form };
      if (student) {
        await api.put(`/students/${student.id}`, payload);
        toast("Student updated", "success");
      } else {
        await api.post("/students", payload);
        toast("Student created", "success");
      }
      onDone();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={student ? "Edit student" : "Add student"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-3">
        <Field label="Full name">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </Field>
          <Field label="Student ID">
            <Input value={form.studentCode} onChange={(e) => set("studentCode", e.target.value)} required />
          </Field>
        </div>
        {!student && (
          <Field label="Password" hint="Temporary password for first login">
            <Input value={form.password} onChange={(e) => set("password", e.target.value)} required />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Course">
            <Select value={form.courseId} onChange={(e) => set("courseId", e.target.value)}>
              <option value="">—</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Batch">
            <Input value={form.batch} onChange={(e) => set("batch", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Guardian name">
            <Input value={form.guardianName} onChange={(e) => set("guardianName", e.target.value)} />
          </Field>
          <Field label="Enrollment date">
            <Input type="date" value={form.enrollmentDate} onChange={(e) => set("enrollmentDate", e.target.value)} />
          </Field>
        </div>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
