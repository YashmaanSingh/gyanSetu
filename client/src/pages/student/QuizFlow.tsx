import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen, ErrorState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { Play, CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-react";

export default function QuizFlow() {
  const { activityId } = useParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const infoQ = useQuery({
    queryKey: ["quiz-info", activityId],
    queryFn: () => api.get<any>(`/quizzes/${activityId}`),
  });

  const [phase, setPhase] = useState<"info" | "attempt" | "result">("info");
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [deadline, setDeadline] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [result, setResult] = useState<any>(null);
  const submittedRef = useRef(false);

  const startMut = useMutation({
    mutationFn: () => api.post<any>(`/quizzes/${activityId}/start`),
    onSuccess: (d) => {
      setAttemptId(d.attemptId);
      setQuestions(d.questions);
      setAnswers({});
      setDeadline(new Date(d.deadlineAt).getTime());
      setSecondsLeft(d.timeLimitMinutes * 60);
      setPhase("attempt");
    },
    onError: (e: any) => toast(e.message, "error"),
  });

  const submitMut = useMutation({
    mutationFn: (ans: { questionId: string; selectedKey: string | null }[]) =>
      api.post<any>(`/quizzes/${attemptId}/submit`, { answers: ans }),
    onSuccess: (d) => {
      setResult(d.result);
      setPhase("result");
      submittedRef.current = true;
      qc.invalidateQueries({ queryKey: ["my-attempts"] });
      qc.invalidateQueries({ queryKey: ["student-today"] });
    },
    onError: (e: any) => toast(e.message, "error"),
  });

  useEffect(() => {
    if (phase !== "attempt") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          if (!submittedRef.current) {
            const ans = Object.entries(answers).map(([questionId, selectedKey]) => ({ questionId, selectedKey: selectedKey || null }));
            submitMut.mutate(ans);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, answers, submitMut]);

  if (infoQ.isLoading) return <LoadingScreen />;
  if (infoQ.error) return <ErrorState message="Quiz not available" onRetry={() => infoQ.refetch()} />;

  const quiz = infoQ.data?.quiz;

  if (phase === "info") {
    return (
      <div className="space-y-4">
        <button onClick={() => nav("/student/activities")} className="text-sm text-slate-500 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Card className="p-5">
          <h1 className="text-xl font-bold text-slate-800">{quiz.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{quiz.description}</p>
          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400">Questions</p>
              <p className="font-semibold text-slate-800">{quiz.questionCount}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400">Time</p>
              <p className="font-semibold text-slate-800">{quiz.timeLimitMinutes} min</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400">Pass</p>
              <p className="font-semibold text-slate-800">{quiz.passingScore}%</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Attempts left: {infoQ.data?.attemptsLeft} · Used: {infoQ.data?.attemptsUsed}
          </p>
          {!infoQ.data?.canStart ? (
            <p className="mt-3 text-sm text-rose-600">You cannot start a new attempt right now.</p>
          ) : (
            <Button className="mt-4 w-full" size="lg" loading={startMut.isPending} onClick={() => startMut.mutate()}>
              <Play className="w-4 h-4" /> Start quiz
            </Button>
          )}
        </Card>
      </div>
    );
  }

  if (phase === "attempt") {
    return (
      <div className="space-y-3">
        <div className="sticky top-14 z-10 flex items-center justify-between bg-white/90 backdrop-blur px-3 py-2 rounded-xl ring-1 ring-slate-200">
          <span className="text-sm font-medium text-slate-700">{quiz.title}</span>
          <span className={`flex items-center gap-1 text-sm font-semibold ${secondsLeft <= 30 ? "text-rose-600" : "text-slate-700"}`}>
            <Clock className="w-4 h-4" /> {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
          </span>
        </div>

        {questions.map((q, qi) => (
          <Card key={q.id} className="p-4">
            <p className="font-medium text-slate-800">
              <span className="text-brand-600 mr-1">{qi + 1}.</span>
              {q.text}
            </p>
            <div className="mt-2 space-y-2">
              {q.options.map((o: any) => (
                <button
                  key={o.key}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.key }))}
                  className={`w-full flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm ${
                    answers[q.id] === o.key
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${answers[q.id] === o.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {o.key}
                  </span>
                  {o.text}
                </button>
              ))}
            </div>
          </Card>
        ))}

        <Button
          fullWidth
          size="lg"
          loading={submitMut.isPending}
          onClick={() => {
            const ans = Object.entries(answers).map(([questionId, selectedKey]) => ({ questionId, selectedKey: selectedKey || null }));
            submitMut.mutate(ans);
          }}
        >
          Submit quiz
        </Button>
      </div>
    );
  }

  // result
  const r = result;
  const passed = r.passed;
  return (
    <div className="space-y-4">
      <Card className={`p-5 text-center ${passed ? "bg-emerald-50" : "bg-rose-50"}`}>
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${passed ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
          {passed ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
        </div>
        <h2 className="mt-3 text-xl font-bold text-slate-800">{passed ? "Passed!" : "Not passed"}</h2>
        <p className="text-3xl font-bold text-slate-800 mt-1">{r.percentage}%</p>
        <p className="text-sm text-slate-500">
          {r.score}/{r.totalMarks} marks · {r.correctCount} correct · {r.wrongCount} wrong · {r.unansweredCount} skipped
        </p>
      </Card>

      <div className="space-y-2">
        {r.details.map((d: any, i: number) => (
          <Card key={d.id} className="p-4">
            <div className="flex items-start gap-2">
              <span className={`mt-0.5 ${d.isCorrect ? "text-emerald-500" : "text-rose-500"}`}>
                {d.isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </span>
              <div className="flex-1">
                <p className="font-medium text-slate-800">
                  <span className="text-brand-600 mr-1">{i + 1}.</span>
                  {d.text}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Your answer: <b>{d.selectedKey || "—"}</b> · Correct: <b>{d.correctKey}</b> · {d.marksAwarded} marks
                </p>
                {d.explanation && <p className="text-sm text-slate-600 mt-1 bg-slate-50 rounded-lg p-2">{d.explanation}</p>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button fullWidth variant="outline" onClick={() => nav("/student/activities")}>
        Back to activities
      </Button>
    </div>
  );
}
