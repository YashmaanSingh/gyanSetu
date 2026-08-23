import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { contentApi, adminContentApi, resolveFileUrl } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge, LoadingScreen, ErrorState, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import {
  GraduationCap,
  BookMarked,
  Plus,
  Pencil,
  Trash2,
  Layers,
  FileText,
  Eye,
  Download,
  Upload,
  X,
} from "lucide-react";
import type {
  ClassItem,
  SubjectRef,
  ChapterRef,
  ChapterDetail,
  ChapterMaterial,
} from "@/lib/types";

const MATERIAL_TYPES = ["pdf", "note", "book", "document", "video", "link", "assignment"];
const MATERIAL_STATUSES: ChapterMaterial["status"][] = ["draft", "published", "archived"];
const CHAPTER_STATUSES: ("draft" | "published" | "archived")[] = ["draft", "published", "archived"];

export default function AdminCurriculum() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");

  const [classModal, setClassModal] = useState(false);
  const [subjectModal, setSubjectModal] = useState<{ open: boolean; edit?: SubjectRef | null }>({ open: false });
  const [chapterModal, setChapterModal] = useState<{ open: boolean; edit?: ChapterRef | null }>({ open: false });
  const [materialModal, setMaterialModal] = useState<{ open: boolean; edit?: ChapterMaterial | null }>({ open: false });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const classesQ = useQuery({ queryKey: ["admin-classes"], queryFn: () => contentApi.listClasses() });
  const subjectsAllQ = useQuery({ queryKey: ["admin-subjects"], queryFn: () => contentApi.listSubjects() });
  const classSubsQ = useQuery({
    queryKey: ["admin-classsubs", classId],
    queryFn: () => contentApi.getClassSubjects(classId),
    enabled: !!classId,
  });
  const chaptersQ = useQuery({
    queryKey: ["admin-chapters", classId, subjectId],
    queryFn: () => contentApi.getSubjectChapters(classId, subjectId),
    enabled: !!classId && !!subjectId,
  });
  const chapterQ = useQuery({
    queryKey: ["admin-chapter", chapterId],
    queryFn: () => contentApi.getChapter(chapterId),
    enabled: !!chapterId,
  });

  function invalidate(...keys: string[][]) {
    keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  }
  function pickClass(id: string) {
    setClassId(id);
    setSubjectId("");
    setChapterId("");
  }
  function pickSubject(id: string) {
    setSubjectId(id);
    setChapterId("");
  }

  const cls = classesQ.data?.classes ?? [];
  const subs = classSubsQ.data?.subjects ?? [];
  const chapters = (chaptersQ.data?.chapters ?? []).slice().sort((a, b) => a.chapterNo - b.chapterNo);

  if (classesQ.isLoading) return <LoadingScreen />;
  if (classesQ.error) return <ErrorState message="Failed to load curriculum" onRetry={() => classesQ.refetch()} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Curriculum</h1>
        <p className="text-sm text-slate-500">Manage classes, subjects, chapters and study materials</p>
      </div>

      {/* Class selection */}
      <Card>
        <CardHeader
          title="Class"
          subtitle="Select a class to manage"
          action={
            <button onClick={() => setClassModal(true)} className="inline-flex items-center gap-1 text-sm text-brand-600 font-medium">
              <Plus className="w-4 h-4" /> Add Class
            </button>
          }
        />
        <div className="p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {cls.map((c) => (
              <button
                key={c.id}
                onClick={() => pickClass(c.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  classId === c.id ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 hover:border-brand-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  <span className="font-semibold text-sm">{c.name}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 capitalize">{c.status}</p>
              </button>
            ))}
            {cls.length === 0 && <p className="text-sm text-slate-400 col-span-full">No classes yet. Add one.</p>}
          </div>
        </div>
      </Card>

      {classId && (
        <ClassSubjectsCard
          classId={classId}
          subjects={subs}
          allSubjects={subjectsAllQ.data?.subjects ?? []}
          onAdd={() => setSubjectModal({ open: true })}
          onEdit={(s) => setSubjectModal({ open: true, edit: s })}
          onRemove={async (csId) => {
            if (!confirm("Remove this subject from the class?")) return;
            try {
              await adminContentApi.removeClassSubject(csId);
              invalidate(["admin-classsubs", classId]);
              toast("Removed from class", "success");
            } catch (e: any) {
              toast(e.message, "error");
            }
          }}
          onDeleteSubject={async (sId) => {
            if (!confirm("Delete this subject entirely? This removes it from ALL classes, chapters and materials. Cannot be undone.")) return;
            try {
              await adminContentApi.deleteSubject(sId);
              invalidate(["admin-subjects"], ["admin-classsubs", classId]);
              toast("Subject deleted", "success");
            } catch (e: any) {
              toast(e.message, "error");
            }
          }}
        />
      )}

      {classId && subjectId && (
        <Card>
          <CardHeader
            title="Chapters"
            subtitle={`${subjectsAllQ.data?.subjects.find((s) => s.id === subjectId)?.name ?? "Subject"} · ${cls.find((c) => c.id === classId)?.name ?? ""}`}
            action={
              <button onClick={() => setChapterModal({ open: true })} className="inline-flex items-center gap-1 text-sm text-brand-600 font-medium">
                <Plus className="w-4 h-4" /> Add Chapter
              </button>
            }
          />
          <div className="p-3 space-y-2">
            {chaptersQ.isLoading && <LoadingScreen />}
            {chapters.length === 0 && !chaptersQ.isLoading && <EmptyState icon={<Layers className="w-6 h-6" />} title="No chapters yet" />}
            {chapters.map((c) => (
              <div
                key={c.id}
                className={`rounded-xl border p-3 transition ${chapterId === c.id ? "border-brand-500 bg-brand-50/40" : "border-slate-200"}`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setChapterId(chapterId === c.id ? "" : c.id)}
                    className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold shrink-0"
                  >
                    {c.chapterNo}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate">{c.title}</p>
                    {c.summary && <p className="text-xs text-slate-500 line-clamp-1">{c.summary}</p>}
                  </div>
                  <Badge tone={c.status === "published" ? "emerald" : c.status === "draft" ? "amber" : "slate"}>{c.status}</Badge>
                  <button onClick={() => setChapterModal({ open: true, edit: c })} className="p-1.5 text-slate-500 hover:text-brand-600">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Delete this chapter and its materials?")) return;
                      try {
                        await adminContentApi.deleteChapter(c.id);
                        invalidate(["admin-chapters", classId, subjectId]);
                        setChapterId("");
                        toast("Chapter deleted", "success");
                      } catch (e: any) {
                        toast(e.message, "error");
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {chapterId && (
        <MaterialsCard
          chapter={chapterQ.data?.chapter}
          loading={chapterQ.isLoading}
          onAdd={() => setMaterialModal({ open: true })}
          onEdit={(m) => setMaterialModal({ open: true, edit: m })}
          onDelete={async (mId) => {
            if (!confirm("Delete this study material?")) return;
            try {
              await adminContentApi.deleteMaterial(mId);
              invalidate(["admin-chapter", chapterId]);
              toast("Material deleted", "success");
            } catch (e: any) {
              toast(e.message, "error");
            }
          }}
          onToggleStatus={async (m) => {
            const next = m.status === "published" ? "archived" : "published";
            try {
              await adminContentApi.updateMaterial(m.id, { status: next });
              invalidate(["admin-chapter", chapterId]);
              toast(`Marked ${next}`, "success");
            } catch (e: any) {
              toast(e.message, "error");
            }
          }}
          onPreview={(url) => setPreviewUrl(resolveFileUrl(url))}
        />
      )}

      {classModal && <ClassModal onClose={() => setClassModal(false)} onSaved={() => invalidate(["admin-classes"])} />}
      {subjectModal.open && (
        <SubjectModal
          classId={classId}
          allSubjects={subjectsAllQ.data?.subjects ?? []}
          edit={subjectModal.edit}
          onClose={() => setSubjectModal({ open: false })}
          onSaved={() => {
            invalidate(["admin-subjects"], ["admin-classsubs", classId]);
            invalidate(["admin-classes"]);
          }}
        />
      )}
      {chapterModal.open && (
        <ChapterModal
          classId={classId}
          subjectId={subjectId}
          edit={chapterModal.edit}
          onClose={() => setChapterModal({ open: false })}
          onSaved={() => invalidate(["admin-chapters", classId, subjectId])}
        />
      )}
      {materialModal.open && (
        <MaterialModal
          chapterId={chapterId}
          edit={materialModal.edit}
          onClose={() => setMaterialModal({ open: false })}
          onSaved={() => invalidate(["admin-chapter", chapterId])}
        />
      )}

      {previewUrl && (
        <Modal open onClose={() => setPreviewUrl(null)} title="Study Material (PDF)" size="lg">
          <iframe src={previewUrl} className="w-full h-[70vh] rounded-xl border border-slate-200" title="PDF" />
          <div className="flex justify-end mt-3">
            <a href={previewUrl} target="_blank" rel="noreferrer" download>
              <Button variant="outline">
                <Download className="w-4 h-4" /> Open / Download
              </Button>
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ClassSubjectsCard({
  classId,
  subjects,
  allSubjects,
  onAdd,
  onEdit,
  onRemove,
  onDeleteSubject,
}: {
  classId: string;
  subjects: SubjectRef[];
  allSubjects: { id: string; name: string }[];
  onAdd: () => void;
  onEdit: (s: SubjectRef) => void;
  onRemove: (csId: string) => void;
  onDeleteSubject: (sId: string) => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Subjects"
        subtitle="Subjects assigned to this class"
        action={
          <button onClick={onAdd} className="inline-flex items-center gap-1 text-sm text-brand-600 font-medium">
            <Plus className="w-4 h-4" /> Add Subject
          </button>
        }
      />
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {subjects.length === 0 && <p className="text-sm text-slate-400 col-span-full">No subjects assigned to this class yet.</p>}
        {subjects.map((s) => (
          <div key={s.classSubjectId} className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <BookMarked className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800 truncate">{s.name}</p>
              <p className="text-xs text-slate-400">Order: {s.orderIndex}</p>
            </div>
            <button onClick={() => onEdit(s)} className="p-1.5 text-slate-500 hover:text-brand-600">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => onRemove(s.classSubjectId)} className="p-1.5 text-slate-500 hover:text-rose-600" title="Remove from class">
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteSubject(s.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600"
              title="Delete subject entirely"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MaterialsCard({
  chapter,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onToggleStatus,
  onPreview,
}: {
  chapter?: ChapterDetail;
  loading: boolean;
  onAdd: () => void;
  onEdit: (m: ChapterMaterial) => void;
  onDelete: (mId: string) => void;
  onToggleStatus: (m: ChapterMaterial) => void;
  onPreview: (url: string) => void;
}) {
  if (loading) return <LoadingScreen />;
  const mats = chapter?.studyMaterials ?? [];
  return (
    <Card>
      <CardHeader
        title="Study Materials"
        subtitle={chapter?.title}
        action={
          <button onClick={onAdd} className="inline-flex items-center gap-1 text-sm text-brand-600 font-medium">
            <Plus className="w-4 h-4" /> Add Material
          </button>
        }
      />
      <div className="p-3 space-y-2">
        {mats.length === 0 && <EmptyState icon={<FileText className="w-6 h-6" />} title="No study materials yet" />}
        {mats.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800 truncate">{m.title}</p>
              {m.description && <p className="text-xs text-slate-500 line-clamp-1">{m.description}</p>}
              <div className="flex items-center gap-1.5 mt-1">
                <Badge tone="brand">{m.type}</Badge>
                <Badge tone={m.status === "published" ? "emerald" : m.status === "draft" ? "amber" : "slate"}>{m.status}</Badge>
                {!m.downloadAllowed && <Badge tone="slate">no download</Badge>}
              </div>
            </div>
            <div className="flex gap-1">
              {m.fileUrl && (
                <>
                  <Button size="sm" variant="outline" onClick={() => onPreview(m.fileUrl!)}>
                    <Eye className="w-3.5 h-3.5" /> View
                  </Button>
                  <a href={resolveFileUrl(m.fileUrl)} target="_blank" rel="noreferrer" download>
                    <Button size="sm">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                </>
              )}
              <button onClick={() => onEdit(m)} className="p-1.5 text-slate-500 hover:text-brand-600">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => onToggleStatus(m)} className="p-1.5 text-slate-500 hover:text-brand-600" title="Publish / Unpublish">
                {m.status === "published" ? <X className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              </button>
              <button onClick={() => onDelete(m.id)} className="p-1.5 text-slate-500 hover:text-rose-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- Modals ----------

function ClassModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [orderIndex, setOrderIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast("Name required", "error");
    setSaving(true);
    try {
      await adminContentApi.createClass({ name: name.trim(), orderIndex });
      toast("Class created", "success");
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add Class">
      <div className="space-y-3">
        <Field label="Class name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Class 6 or UKG" />
        </Field>
        <Field label="Order index">
          <Input type="number" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Create</Button>
        </div>
      </div>
    </Modal>
  );
}

function SubjectModal({
  classId,
  allSubjects,
  edit,
  onClose,
  onSaved,
}: {
  classId: string;
  allSubjects: { id: string; name: string }[];
  edit?: SubjectRef | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"existing" | "new">(edit ? "existing" : "new");
  const [existingId, setExistingId] = useState(edit?.id ?? "");
  const [name, setName] = useState(edit?.name ?? "");
  const [orderIndex, setOrderIndex] = useState(edit?.orderIndex ?? 0);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      if (edit) {
        await adminContentApi.updateSubject(edit.id, { name: name.trim() });
        if (classId) await adminContentApi.addClassSubject({ classId, subjectId: edit.id, orderIndex });
        toast("Subject updated", "success");
      } else {
        let subjectId = existingId;
        if (mode === "new") {
          if (!name.trim()) return toast("Name required", "error");
          const res = await adminContentApi.createSubject({ name: name.trim() });
          subjectId = res.subject.id;
        }
        if (!subjectId) return toast("Select or create a subject", "error");
        await adminContentApi.addClassSubject({ classId, subjectId, orderIndex });
        toast("Subject added to class", "success");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={edit ? "Edit Subject" : "Add Subject to Class"}>
      <div className="space-y-3">
        {!edit && (
          <Field label="Mode">
            <Select value={mode} onChange={(e) => setMode(e.target.value as "existing" | "new")}>
              <option value="new">Create new subject</option>
              <option value="existing">Use existing subject</option>
            </Select>
          </Field>
        )}
        {mode === "existing" && !edit && (
          <Field label="Existing subject">
            <Select value={existingId} onChange={(e) => setExistingId(e.target.value)}>
              <option value="">Select subject</option>
              {allSubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
        )}
        {(mode === "new" || edit) && (
          <Field label="Subject name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mathematics" />
          </Field>
        )}
        <Field label="Order in class">
          <Input type="number" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>{edit ? "Save" : "Add"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function ChapterModal({
  classId,
  subjectId,
  edit,
  onClose,
  onSaved,
}: {
  classId: string;
  subjectId: string;
  edit?: ChapterRef | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(edit?.title ?? "");
  const [chapterNo, setChapterNo] = useState(edit?.chapterNo ?? 1);
  const [summary, setSummary] = useState(edit?.summary ?? "");
  const [status, setStatus] = useState<"draft" | "published" | "archived">((edit?.status as "draft" | "published" | "archived") ?? "published");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return toast("Title required", "error");
    setSaving(true);
    try {
      const body = { classId, subjectId, title: title.trim(), chapterNo, summary, status };
      if (edit) await adminContentApi.updateChapter(edit.id, body);
      else await adminContentApi.createChapter(body);
      toast(edit ? "Chapter updated" : "Chapter created", "success");
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={edit ? "Edit Chapter" : "Add Chapter"}>
      <div className="space-y-3">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapter title" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Chapter number / order">
            <Input type="number" value={chapterNo} onChange={(e) => setChapterNo(Number(e.target.value))} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
              {CHAPTER_STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Summary">
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Short summary" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>{edit ? "Save" : "Create"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function MaterialModal({
  chapterId,
  edit,
  onClose,
  onSaved,
}: {
  chapterId: string;
  edit?: ChapterMaterial | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(edit?.title ?? "");
  const [description, setDescription] = useState(edit?.description ?? "");
  const [type, setType] = useState(edit?.type ?? "pdf");
  const [downloadAllowed, setDownloadAllowed] = useState(edit?.downloadAllowed ?? true);
  const [status, setStatus] = useState<ChapterMaterial["status"]>(edit?.status ?? "published");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      if (edit) {
        await adminContentApi.updateMaterial(edit.id, {
          title: title.trim(),
          description,
          type,
          downloadAllowed,
          status,
        });
        toast("Material updated", "success");
      } else {
        if (!file) return toast("Upload a PDF file", "error");
        if (!title.trim()) setTitle(file.name);
        const form = new FormData();
        form.append("file", file);
        form.append("title", title.trim() || file.name);
        form.append("description", description);
        form.append("type", type);
        form.append("downloadAllowed", String(downloadAllowed));
        form.append("status", status);
        await adminContentApi.createMaterial(chapterId, form);
        toast("Material added", "success");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={edit ? "Edit Study Material" : "Add Study Material"}>
      <div className="space-y-3">
        {!edit && (
          <Field label="PDF file" hint="Upload the study material PDF">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
        )}
        {edit && (
          <p className="text-xs text-slate-400">PDF file cannot be replaced here. Delete and re-add to change the file.</p>
        )}
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Material title" />
        </Field>
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional description" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {MATERIAL_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as ChapterMaterial["status"])}>
              {MATERIAL_STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </Select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={downloadAllowed} onChange={(e) => setDownloadAllowed(e.target.checked)} /> Allow download
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>{edit ? "Save" : "Upload"}</Button>
        </div>
      </div>
    </Modal>
  );
}
