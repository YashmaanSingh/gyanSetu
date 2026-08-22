import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, LoadingScreen, ErrorState, EmptyState } from "@/components/ui/misc";
import { CalendarDays, Play, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fmtDate } from "@/lib/format";
import type { Activity } from "@/lib/types";

export default function StudentActivities() {
  const nav = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["student-activities"],
    queryFn: () => api.get<{ activities: (Activity & { canStart?: boolean; attemptsLeft?: number; attemptsUsed?: number; hasInProgress?: boolean })[] }>("/activities", { pageSize: 50 }),
  });
  const mineQ = useQuery({ queryKey: ["my-attempts"], queryFn: () => api.get<{ attempts: any[] }>("/quizzes/attempts/mine") });

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorState message="Failed to load activities" onRetry={() => refetch()} />;

  const activities = data?.activities ?? [];
  const doneIds = new Set((mineQ.data?.attempts ?? []).map((a) => a.activityId));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Activities & Tasks</h1>
        <p className="text-sm text-slate-500">{activities.length} available</p>
      </div>

      {activities.length === 0 ? (
        <Card>
          <EmptyState icon={<CalendarDays className="w-6 h-6" />} title="No activities yet" />
        </Card>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => {
            const isQuiz = a.type === "mcq" || a.type === "quiz";
            const done = doneIds.has(a.id);
            return (
              <Card key={a.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800 truncate">{a.title}</p>
                    <Badge tone="brand">{a.type}</Badge>
                    {a.isDaily && <Badge tone="amber">daily</Badge>}
                  </div>
                  <p className="text-xs text-slate-500">
                    {a.subjectName || a.courseName || "General"} · {fmtDate(a.activityDate)}
                    {isQuiz && ` · ${a.timeLimitMinutes ?? 10} min · pass ${a.passingScore ?? 50}%`}
                  </p>
                </div>
                {isQuiz ? (
                  done ? (
                    <Badge tone="emerald"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> done</Badge>
                  ) : a.hasInProgress ? (
                    <Button size="sm" onClick={() => nav(`/student/quiz/${a.id}`)}>Resume</Button>
                  ) : (
                    <Button size="sm" onClick={() => nav(`/student/quiz/${a.id}`)}>
                      <Play className="w-3.5 h-3.5" /> Start
                    </Button>
                  )
                ) : (
                  <Badge tone="slate">task</Badge>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
