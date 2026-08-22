import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, LoadingScreen, ErrorState } from "@/components/ui/misc";
import { CalendarDays, BookOpen, ListChecks, Megaphone, ArrowRight, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fmtDate } from "@/lib/format";
import type { Activity, Announcement } from "@/lib/types";

export default function StudentDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const todayQ = useQuery({ queryKey: ["student-today"], queryFn: () => api.get<{ activities: Activity[] }>("/activities/today") });
  const annQ = useQuery({ queryKey: ["student-ann"], queryFn: () => api.get<{ announcements: Announcement[] }>("/announcements", { pageSize: 5 }) });

  if (todayQ.isLoading) return <LoadingScreen />;
  if (todayQ.error) return <ErrorState message="Failed to load" onRetry={() => todayQ.refetch()} />;

  const activities = todayQ.data?.activities ?? [];
  const anns = annQ.data?.announcements ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Hi, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500">{fmtDate(new Date().toISOString().slice(0, 10))} · Let's learn something today</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat icon={BookOpen} label="Study" to="/student/materials" tone="brand" />
        <Stat icon={ListChecks} label="Quizzes" to="/student/activities" tone="emerald" />
        <Stat icon={CalendarDays} label="Tasks" to="/student/activities" tone="amber" />
      </div>

      <Card>
        <CardHeader
          title="Today's activities"
          subtitle={`${activities.length} items`}
          action={
            <Button variant="ghost" size="sm" onClick={() => nav("/student/activities")}>
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          }
        />
        <div className="p-2">
          {activities.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No activities scheduled for today.</p>
          ) : (
            activities.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50">
                <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{a.title}</p>
                  <p className="text-xs text-slate-500">{a.type} · {a.subjectName || a.courseName || "General"}</p>
                </div>
                {a.type === "mcq" || a.type === "quiz" ? (
                  <Button size="sm" onClick={() => nav(`/student/quiz/${a.id}`)}>
                    <Play className="w-3.5 h-3.5" /> Start
                  </Button>
                ) : (
                  <Badge tone="slate">task</Badge>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Announcements" />
        <div className="p-3 space-y-2">
          {anns.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nothing new.</p>
          ) : (
            anns.map((a) => (
              <div key={a.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-800 text-sm">{a.title}</p>
                  <Badge tone={a.priority === "critical" ? "rose" : a.priority === "important" ? "amber" : "slate"}>
                    {a.priority}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 mt-0.5">{a.message}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({ icon: I, label, to, tone }: any) {
  const nav = useNavigate();
  const tones: Record<string, string> = {
    brand: "bg-brand-100 text-brand-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
  };
  return (
    <button onClick={() => nav(to)} className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-white ring-1 ring-slate-200/70">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
        <I className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-slate-600">{label}</span>
    </button>
  );
}
