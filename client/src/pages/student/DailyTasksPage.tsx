import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dailyTaskApi, dailyTaskTypeLabels } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, LoadingScreen, ErrorState, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { Play, Eye, CheckCircle2, Clock, ChevronLeft } from "lucide-react";
import type { DailyTaskDetail, DailyTaskResult, DailyTaskType } from "@/lib/types";

export default function StudentDailyTasks() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"today" | "history">("today");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<DailyTaskResult | null>(null);

  const todayQ = useQuery({ queryKey: ["dt-today"], queryFn: () => dailyTaskApi.today() });
  const histQ = useAnotherQuery(tab, todayQ.isLoading);
  const tasks = tab === "today" ? todayQ.data?.tasks ?? [] : histQ.data?.tasks ?? [];

  function refresh() {
    qc.invalidateQueries({ queryKey: ["dt-today"] });
    qc.invalidateQueries({ queryKey: ["dt-history"] });
  }

  if (result) return <ResultView result={result} onBack={() => { setResult(null); refresh(); }} />;
  if (taskId) return <AttemptView taskId={taskId} onBack={() => { setTaskId(null); refresh(); }} onResult={(r) => { setTaskId(null); setResult(r); }} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Daily Tasks</h1>
        <p className="text-sm text-slate-500">Short daily activities for your class</p>
      </div>

      <div className="flex gap-2">
        {(["today", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm capitalize ${tab === t ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "today" && todayQ.isLoading ? <LoadingScreen /> : null}
      {tab === "history" && histQ.isLoading ? <LoadingScreen /> : null}

      {!todayQ.isLoading && !histQ.isLoading && tasks.length === 0 ? (
        <Card><EmptyState icon={<CheckCircle2 className="w-6 h-6" />} title={tab === "today" ? "No tasks for today" : "No past tasks"} description={tab === "today" ? "Check back later or view history." : undefined} /></Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((t: any) => (
            <Card key={t.id}>
              <div className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 truncate">{t.title}</p>
                    <Badge tone="brand">{dailyTaskTypeLabels[t.type as DailyTaskType]}</Badge>
                    {t.attempt?.attempted && (
                      <Badge tone={t.attempt.evaluated ? "emerald" : "amber"}>
                        {t.attempt.status === "evaluated" ? "Completed" : t.attempt.status === "pending_review" ? "Pending Review" : "Submitted"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.subjectName || "General"} · {t.taskDate} · {t.questionCount} Q · {t.totalMarks} marks
                  </p>
                </div>
                {t.attempt?.attempted ? (
                  <Button size="sm" variant="outline" onClick={() => setResult(t.attempt.submission)}>
                    <Eye className="w-3.5 h-3.5" /> {t.attempt.status === "evaluated" || t.attempt.status === "pending_review" ? "View Result" : "Review"}
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setTaskId(t.id)}>
                    <Play className="w-3.5 h-3.5" /> Start
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function useAnotherQuery(tab: "today" | "history", todayLoading: boolean) {
  return useQuery({
    queryKey: ["dt-history", tab],
    queryFn: () => dailyTaskApi.history(1),
    enabled: tab === "history" && !todayLoading,
  });
}

function AttemptView({ taskId, onBack, onResult }: { taskId: string; onBack: () => void; onResult: (r: DailyTaskResult) => void }) {
  const { toast } = useToast();
  const taskQ = useQuery({ queryKey: ["dt-task", taskId], queryFn: () => dailyTaskApi.getTask(taskId) });
  const [answers, setAnswers] = useState<Record<string, { selectedKey?: string | null; responseText?: string | null }>>({});
  const [submitting, setSubmitting] = useState(false);

  if (taskQ.isLoading) return <LoadingScreen />;
  if (taskQ.error) return <ErrorState message="Failed to load task" onRetry={onBack} />;

  const task: DailyTaskDetail = taskQ.data!;
  const already = task.attempt?.submission;
  if (already) return <ResultView result={already} onBack={onBack} />;

  function setAns(qid: string, val: { selectedKey?: string | null; responseText?: string | null }) {
    setAnswers((a) => ({ ...a, [qid]: val }));
  }

  async function submit() {
    const payload = task.questions.map((q) => ({
      questionId: q.id,
      selectedKey: answers[q.id]?.selectedKey ?? null,
      responseText: answers[q.id]?.responseText ?? null,
    }));
    setSubmitting(true);
    try {
      const res = await dailyTaskApi.submit(task.task.id, payload);
      toast("Submitted", "success");
      onResult(res);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500"><ChevronLeft className="w-4 h-4" /> Back</button>
      <div>
        <h1 className="text-xl font-bold text-slate-800">{task.task.title}</h1>
        <p className="text-sm text-slate-500">{dailyTaskTypeLabels[task.task.type]} · {task.task.subjectName || "General"} · {task.task.totalMarks} marks</p>
        {task.task.instructions && <p className="text-sm text-slate-600 mt-1 bg-slate-50 rounded-xl p-3">{task.task.instructions}</p>}
      </div>

      <div className="space-y-3">
        {task.questions.map((q, i) => (
          <Card key={q.id}>
            <div className="p-3">
              <p className="font-medium text-slate-800">{i + 1}. {q.text} <span className="text-xs text-slate-400">({q.marks} marks)</span></p>
              <div className="mt-2">
                {task.task.type === "mcq" && (
                  <div className="space-y-1">
                    {(q.options || []).map((o) => (
                      <label key={o.key} className="flex items-center gap-2 text-sm">
                        <input type="radio" name={`q-${q.id}`} checked={answers[q.id]?.selectedKey === o.key} onChange={() => setAns(q.id, { selectedKey: o.key })} /> {o.text}
                      </label>
                    ))}
                  </div>
                )}
                {task.task.type === "truefalse" && (
                  <div className="flex gap-3">
                    {["true", "false"].map((v) => (
                      <label key={v} className="flex items-center gap-1 text-sm capitalize">
                        <input type="radio" name={`q-${q.id}`} checked={answers[q.id]?.selectedKey === v} onChange={() => setAns(q.id, { selectedKey: v })} /> {v}
                      </label>
                    ))}
                  </div>
                )}
                {task.task.type === "oneword" && (
                  <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={answers[q.id]?.responseText || ""} onChange={(e) => setAns(q.id, { responseText: e.target.value })} placeholder="Your one-word answer" />
                )}
                {(task.task.type === "short" || task.task.type === "qa") && (
                  <textarea className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" rows={3} value={answers[q.id]?.responseText || ""} onChange={(e) => setAns(q.id, { responseText: e.target.value })} placeholder="Your answer" />
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button fullWidth onClick={submit} loading={submitting}><CheckCircle2 className="w-4 h-4" /> Submit Task</Button>
    </div>
  );
}

function ResultView({ result, onBack }: { result: DailyTaskResult; onBack: () => void }) {
  const total = result.result.totalMarks || 0;
  const pct = result.result.percentage;
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500"><ChevronLeft className="w-4 h-4" /> Back</button>
      <Card>
        <div className="p-4 text-center">
          <div className="text-3xl font-bold text-slate-800">
            {result.result.score ?? "—"} / {total}
            {pct != null && <span className="text-base text-slate-400"> ({pct}%)</span>}
          </div>
          <div className="mt-1">
            {result.result.status === "pending_review" ? (
              <Badge tone="amber"><Clock className="w-3 h-3" /> Pending Review</Badge>
            ) : result.result.status === "evaluated" ? (
              <Badge tone="emerald"><CheckCircle2 className="w-3 h-3" /> Evaluated</Badge>
            ) : (
              <Badge tone="slate">Submitted</Badge>
            )}
          </div>
          {result.result.feedback && <p className="text-sm text-slate-600 mt-2">{result.result.feedback}</p>}
        </div>
      </Card>

      <div className="space-y-2">
        {result.questions.map((q, i) => (
          <Card key={q.id}>
            <div className="p-3">
              <p className="font-medium text-slate-800 text-sm">{i + 1}. {q.text}</p>
              {(q.type === "mcq" || q.type === "truefalse") ? (
                <p className="text-sm text-slate-600 mt-1">
                  Your answer: <span className="font-medium">{q.selectedKey || "—"}</span> ·{" "}
                  {q.isCorrect ? <span className="text-emerald-600">Correct</span> : <span className="text-rose-600">Incorrect</span>}
                </p>
              ) : (
                <p className="text-sm text-slate-600 mt-1">Your answer: <span className="font-medium">{q.responseText || "—"}</span></p>
              )}
              {q.explanation && <p className="text-xs text-slate-400 mt-1">{q.explanation}</p>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
