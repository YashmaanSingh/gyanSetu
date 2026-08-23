import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { dailyTaskApi } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, LoadingScreen, ErrorState, EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/Modal";
import { Textarea, Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { Eye, ArrowLeft } from "lucide-react";
import type { DailyTaskResult, DailySubmission } from "@/lib/types";

export default function AdminDailyTaskResults() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [openId, setOpenId] = useState<string | null>(null);

  const subsQ = useQuery({ queryKey: ["dt-subs", id], queryFn: () => dailyTaskApi.submissions(id!) });
  const detailQ = useQuery({
    queryKey: ["dt-sub-detail", openId],
    queryFn: () => dailyTaskApi.getSubmission(openId!),
    enabled: !!openId,
  });

  async function submitReview(feedback: string, answers: { questionId: string; marksAwarded: number | null; isCorrect: boolean | null }[], status: "evaluated" | "pending_review") {
    if (!openId) return;
    try {
      await dailyTaskApi.review(openId, { feedback, status, answers });
      toast("Review saved", "success");
      qc.invalidateQueries({ queryKey: ["dt-subs", id] });
      setOpenId(null);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  if (subsQ.isLoading) return <LoadingScreen />;
  if (subsQ.error) return <ErrorState message="Failed to load submissions" />;

  const subs = subsQ.data?.submissions ?? [];

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav("/admin/daily-tasks")}><ArrowLeft className="w-4 h-4" /> Back</Button>
        <h1 className="text-xl font-bold text-slate-800">Submissions</h1>
      </div>

      {subs.length === 0 ? (
        <Card><EmptyState icon={<Eye className="w-6 h-6" />} title="No submissions yet" /></Card>
      ) : (
        <div className="space-y-2">
          {subs.map((s: DailySubmission) => (
            <Card key={s.submissionId}>
              <div className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{s.studentName}</p>
                  <p className="text-xs text-slate-500">{s.className || "—"} · {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : ""}</p>
                </div>
                <Badge tone={s.status === "evaluated" ? "emerald" : s.status === "pending_review" ? "amber" : "slate"}>{s.status}</Badge>
                <span className="text-sm text-slate-600">{s.score ?? "—"}/{s.totalMarks}{s.percentage != null ? ` (${s.percentage}%)` : ""}</span>
                <Button size="sm" variant="outline" onClick={() => setOpenId(s.submissionId)}><Eye className="w-3.5 h-3.5" /> Review</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SubmissionModal
        open={!!openId}
        data={detailQ.data}
        loading={detailQ.isLoading}
        onClose={() => setOpenId(null)}
        onReview={submitReview}
      />
    </div>
  );
}

function SubmissionModal({
  open,
  data,
  loading,
  onClose,
  onReview,
}: {
  open: boolean;
  data?: DailyTaskResult;
  loading: boolean;
  onClose: () => void;
  onReview: (feedback: string, answers: { questionId: string; marksAwarded: number | null; isCorrect: boolean | null }[], status: "evaluated" | "pending_review") => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [correct, setCorrect] = useState<Record<string, string>>({});

  const questions = data?.questions ?? [];

  function handleReview(status: "evaluated" | "pending_review") {
    const answers = questions
      .filter((q) => q.type === "short" || q.type === "qa" || correct[q.id] !== undefined)
      .map((q) => ({
        questionId: q.id,
        marksAwarded: marks[q.id] !== undefined && marks[q.id] !== "" ? Number(marks[q.id]) : (q.marksAwarded ?? null),
        isCorrect: correct[q.id] !== undefined ? correct[q.id] === "yes" : q.isCorrect,
      }));
    onReview(feedback, answers, status);
  }

  return (
    <Modal open={open} onClose={onClose} title="Review submission" size="lg">
      {loading && <LoadingScreen />}
      {!loading && data && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Score: {data.result.score ?? "—"} / {data.result.totalMarks}{data.result.percentage != null ? ` (${data.result.percentage}%)` : ""}</span>
            <Badge tone={data.result.status === "evaluated" ? "emerald" : "amber"}>{data.result.status}</Badge>
          </div>
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-slate-200 p-3">
              <p className="font-medium text-slate-800 text-sm">{i + 1}. {q.text}</p>
              {(q.type === "mcq" || q.type === "truefalse") ? (
                <p className="text-sm text-slate-600 mt-1">
                  Answer: <span className="font-medium">{q.selectedKey || "—"}</span> ·{" "}
                  {q.isCorrect ? <span className="text-emerald-600">Correct</span> : <span className="text-rose-600">Incorrect</span>}
                  {" "}({q.marksAwarded ?? 0} marks)
                </p>
              ) : (
                <div className="mt-1 space-y-2">
                  <p className="text-sm text-slate-600">Response: <span className="font-medium">{q.responseText || "—"}</span></p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500">Correct?</span>
                    <label className="flex items-center gap-1 text-xs"><input type="radio" name={`c-${q.id}`} checked={correct[q.id] === "yes"} onChange={() => setCorrect((c) => ({ ...c, [q.id]: "yes" }))} /> Yes</label>
                    <label className="flex items-center gap-1 text-xs"><input type="radio" name={`c-${q.id}`} checked={correct[q.id] === "no"} onChange={() => setCorrect((c) => ({ ...c, [q.id]: "no" }))} /> No</label>
                    <Input className="w-24" type="number" placeholder="Marks" value={marks[q.id] ?? ""} onChange={(e) => setMarks((m) => ({ ...m, [q.id]: e.target.value }))} />
                  </div>
                </div>
              )}
            </div>
          ))}
          <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback for student (optional)" rows={2} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleReview("pending_review")}>Save as Pending</Button>
            <Button onClick={() => handleReview("evaluated")}>Mark Evaluated</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
