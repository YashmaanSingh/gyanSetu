import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, resolveFileUrl } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge, LoadingScreen, ErrorState, Pagination, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { Plus, Pencil, Trash2, FileText, BookOpen, Link2, Search } from "lucide-react";
import { fmtDate, MATERIAL_TYPES } from "@/lib/format";
import type { Material } from "@/lib/types";
import { FileUpload } from "@/components/ui/FileUpload";

const TABS = [
  { value: "", label: "All" },
  { value: "note", label: "Notes" },
  { value: "book", label: "Books" },
  { value: "pdf", label: "PDFs" },
  { value: "document", label: "Docs" },
];

export default function AdminMaterials() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["materials-admin", page, q, tab],
    queryFn: () => api.get<{ materials: Material[]; pagination: any }>("/materials", { page, pageSize: 12, q, type: tab }),
  });
  const subjectsQ = useQuery({ queryKey: ["subjects"], queryFn: () => api.get<{ subjects: any[] }>("/meta/subjects") });
  const coursesQ = useQuery({ queryKey: ["courses"], queryFn: () => api.get<{ courses: any[] }>("/meta/courses") });

  async function remove(m: Material) {
    if (!confirm(`Delete "${m.title}"?`)) return;
    try {
      await api.del(`/materials/${m.id}`);
      toast("Material deleted", "success");
      qc.invalidateQueries({ queryKey: ["materials-admin"] });
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorState message="Failed to load materials" onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Materials</h1>
          <p className="text-sm text-slate-500">Notes, books & resources</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTab(t.value); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap ${
              tab === t.value ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search materials…" className="pl-9" />
      </div>

      {data?.materials.length === 0 ? (
        <Card>
          <EmptyState title="No materials" description="Upload notes, books or links." />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data?.materials.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              {m.thumbnailUrl ? (
                <img src={resolveFileUrl(m.thumbnailUrl)} alt="" className="h-32 w-full object-cover" />
              ) : (
                <div className="h-32 w-full bg-gradient-to-br from-brand-100 to-sky-100 flex items-center justify-center text-brand-500">
                  {m.type === "book" ? <BookOpen className="w-10 h-10" /> : m.type === "link" ? <Link2 className="w-10 h-10" /> : <FileText className="w-10 h-10" />}
                </div>
              )}
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <Badge tone="brand">{m.type}</Badge>
                  <Badge tone={m.status === "published" ? "emerald" : "amber"}>{m.status}</Badge>
                </div>
                <p className="mt-1.5 font-semibold text-slate-800 line-clamp-1">{m.title}</p>
                <p className="text-xs text-slate-500 line-clamp-1">{m.subjectName || m.courseName || "General"}</p>
                <div className="flex gap-1 mt-3">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(m); setOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  {m.fileUrl && (
                    <a href={resolveFileUrl(m.fileUrl)} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm">Open</Button>
                    </a>
                  )}
                  <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => remove(m)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={setPage} />

      {open && (
        <MaterialForm
          material={editing}
          subjects={subjectsQ.data?.subjects ?? []}
          courses={coursesQ.data?.courses ?? []}
          onClose={() => setOpen(false)}
          onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["materials-admin"] }); }}
        />
      )}
    </div>
  );
}

function MaterialForm({ material, subjects, courses, onClose, onDone }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: material?.title ?? "",
    description: material?.description ?? "",
    type: material?.type ?? "note",
    subjectId: material?.subjectId ?? "",
    courseId: material?.courseId ?? "",
    visibility: material?.visibility ?? "all",
    status: material?.status ?? "published",
    author: material?.author ?? "",
    externalUrl: material?.externalUrl ?? "",
    batch: material?.batch ?? "",
  });
  const [file, setFile] = useState<any>(material?.fileId ? { id: material.fileId, originalName: material.fileName } : null);
  const [busy, setBusy] = useState(false);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, fileId: file?.id ?? null };
      if (material) await api.put(`/materials/${material.id}`, payload);
      else await api.post("/materials", payload);
      toast("Saved", "success");
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
      title={material ? "Edit material" : "Add material"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy}>Save</Button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-3">
        <Field label="Title">
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} required />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
              {MATERIAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="published">published</option>
              <option value="draft">draft</option>
              <option value="archived">archived</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Subject">
            <Select value={form.subjectId} onChange={(e) => set("subjectId", e.target.value)}>
              <option value="">—</option>
              {subjects.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Course">
            <Select value={form.courseId} onChange={(e) => set("courseId", e.target.value)}>
              <option value="">—</option>
              {courses.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Visibility">
            <Select value={form.visibility} onChange={(e) => set("visibility", e.target.value)}>
              <option value="all">All students</option>
              <option value="course">Course only</option>
              <option value="batch">Batch only</option>
            </Select>
          </Field>
          <Field label="Author">
            <Input value={form.author} onChange={(e) => set("author", e.target.value)} />
          </Field>
        </div>
        {form.type === "link" ? (
          <Field label="External URL">
            <Input value={form.externalUrl} onChange={(e) => set("externalUrl", e.target.value)} placeholder="https://…" />
          </Field>
        ) : (
          <FileUpload
            label="File"
            value={file}
            onChange={setFile}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mp3,.zip,.txt"
            hint="PDF, doc, image, video, audio…"
          />
        )}
      </form>
    </Modal>
  );
}
