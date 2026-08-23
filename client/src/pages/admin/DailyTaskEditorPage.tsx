import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { dailyTaskApi, contentApi } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { LoadingScreen, ErrorState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { Plus, Trash2, Save, Send } from "lucide-react";
import type { DailyTaskType, DailyQuestionAdmin } from "@/lib/types";

const TYPES: DailyTaskType[] = ["mcq", "truefalse", "oneword", "short", "qa"];
const TYPE_LABEL: Record<DailyTaskType, string> = {
  mcq: "MCQ",
  truefalse: "True / False",
  oneword: "One Word Answer",
  short: "Short Answer",
  qa: "Quick Q&A",
};

function newQuestion(type: DailyTaskType): DailyQuestionAdmin {
  if (type === "mcq")
    return { text: "", marks: 1, options: [
      { key: "a", text: "", isCorrect: true },
      { key: "b", text: "", isCorrect: false },
    ] };
  if (type === "truefalse") return { text: "", marks: 1, correctKey: "true" };
  if (type === "oneword") return { text: "", marks: 1, correctAnswer: "", caseInsensitive: true };
  return { text: "", marks: 1 };
}

export default function AdminDailyTaskEditor() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const classesQ = useQuery({ queryKey: ["editor-classes"], queryFn: () => contentApi.listClasses() });
  const existingQ = useQuery({
    queryKey: ["dt-edit", id],
    queryFn: () => dailyTaskApi.getAdmin(id!),
    enabled: isEdit,
  });

  const [form, setForm] = useState({
    title: "",
    instructions: "",
    type: "mcq" as DailyTaskType,
    classId: "",
    subjectId: "",
    chapterId: "",
    taskDate: new Date().toISOString().slice(0, 10),
    timeLimitMinutes: 0,
    allowReattempt: false,
  });
  const [questions, setQuestions] = useState<DailyQuestionAdmin[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && existingQ.data) {
      const t = existingQ.data.task;
      setForm({
        title: t.title,
        instructions: t.instructions || "",
        type: t.type,
        classId: t.classId,
        subjectId: t.subjectId || "",
        chapterId: t.chapterId || "",
        taskDate: t.taskDate,
        timeLimitMinutes: t.timeLimitMinutes,
        allowReattempt: t.allowReattempt,
      });
      setQuestions(existingQ.data.questions.map((q) => ({ ...q, options: q.options || [] })));
    }
  }, [isEdit, existingQ.data]);

  const subjectsQ = useQuery({
    queryKey: ["editor-subjects", form.classId],
    queryFn: () => contentApi.getClassSubjects(form.classId),
    enabled: !!form.classId,
  });
  const chaptersQ = useQuery({
    queryKey: ["editor-chapters", form.classId, form.subjectId],
    queryFn: () => contentApi.getSubjectChapters(form.classId, form.subjectId),
    enabled: !!(form.classId && form.subjectId),
  });

  if (isEdit && existingQ.isLoading) return <LoadingScreen />;
  if (isEdit && existingQ.error) return <ErrorState message="Failed to load task" />;
  if (classesQ.isLoading) return <LoadingScreen />;

  function update(q: DailyQuestionAdmin, i: number, patch: Partial<DailyQuestionAdmin>) {
    setQuestions((qs) => qs.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function addQuestion() {
    setQuestions((qs) => [...qs, newQuestion(form.type)]);
  }
  function removeQuestion(i: number) {
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  }

  function setOptionText(i: number, oi: number, text: string) {
    setQuestions((qs) =>
      qs.map((q, qi) =>
        qi === i
          ? { ...q, options: (q.options || []).map((o, oj) => (oj === oi ? { ...o, text } : o)) }
          : q
      )
    );
  }
  function setCorrectOption(i: number, oi: number) {
    setQuestions((qs) =>
      qs.map((q, qi) =>
        qi === i
          ? { ...q, options: (q.options || []).map((o, oj) => ({ ...o, isCorrect: oj === oi })) }
          : q
      )
    );
  }
  function addOption(i: number) {
    setQuestions((qs) =>
      qs.map((q, qi) => {
        if (qi !== i) return q;
        const opts = q.options || [];
        const key = String.fromCharCode(97 + opts.length);
        return { ...q, options: [...opts, { key, text: "", isCorrect: false }] };
      })
    );
  }
  function removeOption(i: number, oi: number) {
    setQuestions((qs) =>
      qs.map((q, qi) =>
        qi === i ? { ...q, options: (q.options || []).filter((_, oj) => oj !== oi) } : q
      )
    );
  }

  function buildPayload(publish: boolean) {
    const payload: any = {
      title: form.title,
      instructions: form.instructions,
      type: form.type,
      classId: form.classId,
      subjectId: form.subjectId,
      chapterId: form.chapterId,
      taskDate: form.taskDate,
      timeLimitMinutes: Number(form.timeLimitMinutes) || 0,
      allowReattempt: form.allowReattempt,
      status: publish ? "published" : "draft",
      questions: questions.map((q, i) => {
        const base: any = { text: q.text, marks: Number(q.marks) || 1, orderIndex: i, explanation: q.explanation || "" };
        if (form.type === "mcq") {
          const opts = (q.options || []).map((o) => ({ key: o.key, text: o.text, isCorrect: !!o.isCorrect }));
          const correct = opts.find((o) => o.isCorrect);
          base.options = opts;
          base.correctKey = correct?.key || opts[0]?.key;
        } else if (form.type === "truefalse") {
          base.correctKey = q.correctKey || "true";
        } else if (form.type === "oneword") {
          base.correctAnswer = q.correctAnswer || "";
          base.caseInsensitive = q.caseInsensitive ?? true;
        }
        return base;
      }),
    };
    return payload;
  }

  async function save(publish: boolean) {
    if (!form.title.trim()) return toast("Title is required", "error");
    if (!form.classId) return toast("Select a class", "error");
    if (questions.length === 0) return toast("Add at least one question", "error");
    for (const q of questions) {
      if (!q.text.trim()) return toast("Every question needs text", "error");
      if (form.type === "mcq") {
        const opts = q.options || [];
        if (opts.filter((o) => o.isCorrect).length !== 1) return toast("Mark one correct option per MCQ", "error");
        if (opts.some((o) => !o.text.trim())) return toast("Fill all MCQ options", "error");
      }
      if (form.type === "oneword" && !q.correctAnswer?.trim()) return toast("Set the correct one-word answer", "error");
    }
    setSaving(true);
    try {
      const payload = buildPayload(publish);
      if (isEdit) await dailyTaskApi.update(id!, payload);
      else await dailyTaskApi.create(payload);
      toast(publish ? "Task published" : "Task saved as draft", "success");
      qc.invalidateQueries({ queryKey: ["admin-daily-tasks"] });
      nav("/admin/daily-tasks");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{isEdit ? "Edit Daily Task" : "New Daily Task"}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save(false)} loading={saving}>
            <Save className="w-4 h-4" /> Save Draft
          </Button>
          <Button onClick={() => save(true)} loading={saving}>
            <Send className="w-4 h-4" /> Publish
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader title="Task details" />
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Title" className="md:col-span-2">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Maths Mental Math" />
          </Field>
          <Field label="Class" className="md:col-span-2">
            <Select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value, subjectId: "", chapterId: "" })}>
              <option value="">Select class</option>
              {(classesQ.data?.classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Subject (optional)">
            <Select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value, chapterId: "" })} disabled={!form.classId}>
              <option value="">No subject</option>
              {(subjectsQ.data?.subjects ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Chapter / Topic (optional)">
            <Select value={form.chapterId} onChange={(e) => setForm({ ...form, chapterId: e.target.value })} disabled={!form.subjectId}>
              <option value="">No chapter</option>
              {(chaptersQ.data?.chapters ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </Select>
          </Field>
          <Field label="Task type">
            <Select value={form.type} onChange={(e) => {
              const t = e.target.value as DailyTaskType;
              setForm({ ...form, type: t });
              setQuestions((qs) => qs.map((q) => ({ ...q, options: q.options || [] })));
            }}>
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </Select>
          </Field>
          <Field label="Task date">
            <Input type="date" value={form.taskDate} onChange={(e) => setForm({ ...form, taskDate: e.target.value })} />
          </Field>
          <Field label="Time limit (minutes, 0 = none)">
            <Input type="number" min={0} value={form.timeLimitMinutes} onChange={(e) => setForm({ ...form, timeLimitMinutes: Number(e.target.value) })} />
          </Field>
          <Field label="Allow reattempt">
            <label className="flex items-center gap-2 text-sm text-slate-700 pt-2">
              <input type="checkbox" checked={form.allowReattempt} onChange={(e) => setForm({ ...form, allowReattempt: e.target.checked })} />
              Students can attempt again
            </label>
          </Field>
          <Field label="Instructions" className="md:col-span-2">
            <Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={2} placeholder="Optional instructions shown to students" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Questions"
          subtitle={`${questions.length} question(s)`}
          action={<Button size="sm" variant="outline" onClick={addQuestion}><Plus className="w-3.5 h-3.5" /> Add</Button>}
        />
        <div className="p-3 space-y-3">
          {questions.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No questions yet.</p>}
          {questions.map((q, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="mt-2 text-sm font-semibold text-slate-400">{i + 1}.</span>
                <Textarea className="flex-1" rows={2} value={q.text} onChange={(e) => update(q, i, { text: e.target.value })} placeholder="Question text" />
                <div className="flex flex-col gap-1">
                  <Input type="number" min={1} className="w-20" value={q.marks} onChange={(e) => update(q, i, { marks: Number(e.target.value) })} title="Marks" />
                  <button onClick={() => removeQuestion(i)} className="text-rose-600 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {form.type === "mcq" && (
                <div className="space-y-1 pl-6">
                  {(q.options || []).map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="radio" name={`corr-${i}`} checked={!!o.isCorrect} onChange={() => setCorrectOption(i, oi)} />
                      <Input className="flex-1" value={o.text} onChange={(e) => setOptionText(i, oi, e.target.value)} placeholder={`Option ${o.key}`} />
                      <button onClick={() => removeOption(i, oi)} className="text-slate-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => addOption(i)}><Plus className="w-3.5 h-3.5" /> Option</Button>
                </div>
              )}

              {form.type === "truefalse" && (
                <div className="flex gap-3 pl-6">
                  {["true", "false"].map((v) => (
                    <label key={v} className="flex items-center gap-1 text-sm capitalize">
                      <input type="radio" name={`tf-${i}`} checked={q.correctKey === v} onChange={() => update(q, i, { correctKey: v })} /> {v}
                    </label>
                  ))}
                </div>
              )}

              {form.type === "oneword" && (
                <div className="pl-6 space-y-1">
                  <Input value={q.correctAnswer} onChange={(e) => update(q, i, { correctAnswer: e.target.value })} placeholder="Correct answer" />
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={q.caseInsensitive ?? true} onChange={(e) => update(q, i, { caseInsensitive: e.target.checked })} /> Case-insensitive match
                  </label>
                </div>
              )}

              {(form.type === "short" || form.type === "qa") && (
                <p className="text-xs text-slate-400 pl-6">Student types a free-text answer. You review and assign marks manually.</p>
              )}

              <Input className="ml-6 w-1/2" value={q.explanation || ""} onChange={(e) => update(q, i, { explanation: e.target.value })} placeholder="Explanation (optional)" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
