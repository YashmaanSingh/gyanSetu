import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select, Textarea } from "@/components/ui/Input";
import { Plus, Trash2 } from "lucide-react";
import { ACTIVITY_TYPES } from "@/lib/format";

export interface QuestionDraft {
  text: string;
  options: { key: string; text: string }[];
  correctKey: string;
  marks: number;
  explanation: string;
  difficulty: string;
  orderIndex: number;
}

function blankQuestion(i: number): QuestionDraft {
  return {
    text: "",
    options: [
      { key: "A", text: "" },
      { key: "B", text: "" },
    ],
    correctKey: "A",
    marks: 2,
    explanation: "",
    difficulty: "easy",
    orderIndex: i,
  };
}

export function ActivityForm({ activity, subjects, courses, onClose, onDone }: any) {
  const { toast } = useToast();
  const isMcq = activity?.type === "mcq" || activity?.type === "quiz";
  const [form, setForm] = useState({
    title: activity?.title ?? "",
    description: activity?.description ?? "",
    type: activity?.type ?? "mcq",
    activityDate: activity?.activityDate ?? new Date().toISOString().slice(0, 10),
    subjectId: activity?.subjectId ?? "",
    courseId: activity?.courseId ?? "",
    batch: activity?.batch ?? "",
    timeLimitMinutes: activity?.timeLimitMinutes ?? 10,
    passingScore: activity?.passingScore ?? 50,
    maxAttempts: activity?.maxAttempts ?? 1,
    status: activity?.status ?? "published",
    isDaily: activity?.isDaily ?? false,
  });
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    activity?.questions?.length
      ? activity.questions.map((q: any, i: number) => ({
          text: q.text,
          options: q.options ?? [{ key: "A", text: "" }, { key: "B", text: "" }],
          correctKey: q.correctKey ?? "A",
          marks: q.marks ?? 2,
          explanation: q.explanation ?? "",
          difficulty: q.difficulty ?? "easy",
          orderIndex: i,
        }))
      : [blankQuestion(0)]
  );
  const [busy, setBusy] = useState(false);

  function set(k: string, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function updateQ(idx: number, patch: Partial<QuestionDraft>) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }
  function updateOpt(qIdx: number, oIdx: number, text: string) {
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((o, j) => (j === oIdx ? { ...o, text } : o)) }
          : q
      )
    );
  }
  function addOption(qIdx: number) {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIdx) return q;
        const nextKey = String.fromCharCode(65 + q.options.length);
        return { ...q, options: [...q.options, { key: nextKey, text: "" }] };
      })
    );
  }
  function removeOption(qIdx: number, oIdx: number) {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIdx || q.options.length <= 2) return q;
        const opts = q.options.filter((_, j) => j !== oIdx);
        const rekeyed = opts.map((o, j) => ({ ...o, key: String.fromCharCode(65 + j) }));
        const stillValid = rekeyed.some((o) => o.key === q.correctKey);
        return { ...q, options: rekeyed, correctKey: stillValid ? q.correctKey : rekeyed[0].key };
      })
    );
  }
  function addQuestion() {
    setQuestions((qs) => [...qs, blankQuestion(qs.length)]);
  }
  function removeQuestion(idx: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if ((form.type === "mcq" || form.type === "quiz") && questions.some((q) => !q.text || q.options.some((o) => !o.text))) {
      toast("Fill all question texts and options", "error");
      return;
    }
    setBusy(true);
    try {
      const payload: any = { ...form };
      if (form.type === "mcq" || form.type === "quiz") {
        payload.questions = questions.map((q, i) => ({ ...q, orderIndex: i }));
      }
      if (activity) await api.put(`/activities/${activity.id}`, payload);
      else await api.post("/activities", payload);
      toast("Saved", "success");
      onDone();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
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
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" value={form.activityDate} onChange={(e) => set("activityDate", e.target.value)} />
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

      {(form.type === "mcq" || form.type === "quiz") && (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Time (min)">
            <Input type="number" value={form.timeLimitMinutes} onChange={(e) => set("timeLimitMinutes", +e.target.value)} />
          </Field>
          <Field label="Pass %">
            <Input type="number" value={form.passingScore} onChange={(e) => set("passingScore", +e.target.value)} />
          </Field>
          <Field label="Attempts">
            <Input type="number" value={form.maxAttempts} onChange={(e) => set("maxAttempts", +e.target.value)} />
          </Field>
        </div>
      )}

      <Field label="Status">
        <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
          <option value="published">published</option>
          <option value="draft">draft</option>
          <option value="archived">archived</option>
        </Select>
      </Field>

      {isMcq && (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <p className="font-medium text-slate-700">Questions ({questions.length})</p>
            <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
              <Plus className="w-3.5 h-3.5" /> Add question
            </Button>
          </div>
          {questions.map((q, qi) => (
            <div key={qi} className="rounded-xl border border-slate-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-600">Q{qi + 1}</span>
                <button type="button" onClick={() => removeQuestion(qi)} className="text-rose-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <Input
                value={q.text}
                onChange={(e) => updateQ(qi, { text: e.target.value })}
                placeholder="Question text"
              />
              {q.options.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQ(qi, { correctKey: o.key })}
                    className={`w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
                      q.correctKey === o.key ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                    title="Mark correct"
                  >
                    {o.key}
                  </button>
                  <Input
                    value={o.text}
                    onChange={(e) => updateOpt(qi, oi, e.target.value)}
                    placeholder={`Option ${o.key}`}
                  />
                  {q.options.length > 2 && (
                    <button type="button" onClick={() => removeOption(qi, oi)} className="text-slate-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => addOption(qi)} className="text-xs text-brand-600 font-medium">
                + Add option
              </button>
              <div className="flex gap-3">
                <Field label="Marks" className="w-24">
                  <Input type="number" value={q.marks} onChange={(e) => updateQ(qi, { marks: +e.target.value })} />
                </Field>
                <Field label="Difficulty" className="flex-1">
                  <Select value={q.difficulty} onChange={(e) => updateQ(qi, { difficulty: e.target.value })}>
                    <option value="easy">easy</option>
                    <option value="medium">medium</option>
                    <option value="hard">hard</option>
                  </Select>
                </Field>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={busy}>Save</Button>
      </div>
    </form>
  );
}
