import { useQuery } from "@tanstack/react-query";
import { api, dailyTaskApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, LoadingScreen, ErrorState } from "@/components/ui/misc";
import {
  GraduationCap,
  BookOpen,
  ListChecks,
  CalendarDays,
  Sparkles,
  Plus,
  BookMarked,
  Play,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fmtDate } from "@/lib/format";
import type { Activity, Announcement, MyClassResponse } from "@/lib/types";

export default function StudentDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();

  const myClassQ = useQuery<MyClassResponse>({
    queryKey: ["student-my-class"],
    queryFn: () => api.get<MyClassResponse>("/my-class"),
  });
  const todayQ = useQuery({
    queryKey: ["student-today"],
    queryFn: () => api.get<{ activities: Activity[] }>("/activities/today"),
  });
  const annQ = useQuery({
    queryKey: ["student-ann"],
    queryFn: () => api.get<{ announcements: Announcement[] }>("/announcements", { pageSize: 5 }),
  });
  const dtQ = useQuery({ queryKey: ["student-dt-today"], queryFn: () => dailyTaskApi.today() });

  if (myClassQ.isLoading || todayQ.isLoading) return <LoadingScreen />;
  if (myClassQ.error || todayQ.error)
    return <ErrorState message="Failed to load" onRetry={() => myClassQ.refetch()} />;

  const myClass = myClassQ.data?.class;
  const mySubjects = myClassQ.data?.subjects ?? [];
  const activities = todayQ.data?.activities ?? [];
  const anns = annQ.data?.announcements ?? [];
  const dtTasks = dtQ.data?.tasks ?? [];
  const pendingDt = dtTasks.filter((t: any) => !t.attempt?.attempted);

  const className = myClass?.name || "Your Class";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Hi, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-slate-500">
          {fmtDate(new Date().toISOString().slice(0, 10))} · Let's learn something today
        </p>
      </div>

      {/* Your Class section */}
      <Card>
        <CardHeader
          title="Your Class"
          subtitle="The class you are enrolled in"
          action={
            <button
              onClick={() => nav("/student/library")}
              className="inline-flex items-center gap-1 text-sm text-brand-600 font-medium hover:underline"
            >
              <Plus className="w-4 h-4" /> Explore Full Syllabus
            </button>
          }
        >
        </CardHeader>
        {myClass ? (
          <div className="p-3 flex items-center">
            <GraduationCap className="w-4 h-4 mr-2 text-brand-600" />
            <span className="font-semibold text-slate-800">{className}</span>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No class assigned</p>
        )}
      </Card>

      {/* Your Subjects section */}
      {myClass && (
        <Card>
          <CardHeader
            title="Your Subjects"
            subtitle={`Subjects mapped to ${className}`}
          >
          </CardHeader>
          {mySubjects.length === 0 ? (
            <p className="text-sm text-slate-400 p-3">
              No subjects assigned to your class yet.
            </p>
          ) : (
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {mySubjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => nav("/student/library")}
                  className={
                    `rounded-xl border p-3 text-left transition ${
                      s.orderIndex % 2 === 0
                        ? "border-slate-200 hover:border-brand-300"
                        : "border-brand-100 hover:border-brand-200"
                    } hover:bg-brand-50`
                  }
                >
                  <div className="flex items-center gap-2">
                    <BookMarked className="w-4 h-4" />
                    <span className="font-semibold text-sm capitalize">
                      {s.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Order: {s.orderIndex}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat
          icon={BookOpen}
          label="Study"
          to="/student/materials"
        />
        <Stat
          icon={ListChecks}
          label="Quizzes"
          to="/student/activities"
        />
        <Stat icon={CalendarDays} label="Tasks" to="/student/daily-tasks" />
      </div>

      {pendingDt.length > 0 && (
        <Card
          className="bg-gradient-to-br from-brand-600 to-indigo-600 text-white"
        >
          <div className="p-4">
            <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
              <Sparkles className="w-4 h-4" /> Today's Daily Task
            </div>
            <div className="mt-2 space-y-2">
              {pendingDt.map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 bg-white/10 rounded-xl p-2.5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{t.title}</p>
                    <p className="text-xs text-white/80">
                      {t.subjectName || "General"} ·{" "}
                      {t.questionCount} Q · {t.totalMarks} marks
                    </p>
                  </div>
                  <Button onClick={() => nav(`/student/daily-tasks`)}>
                    <Play className="w-3.5 h-3.5" /> Start Task
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Today's activities"
          subtitle={`${activities.length} items`}
          action={
            <button
              onClick={() => nav("/student/activities")}
              className="inline-flex items-center gap-1 text-sm text-brand-600 font-medium"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
        </CardHeader>
        <div className="p-2">
          {activities.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No activities scheduled for today.
            </p>
          ) : (
            activities.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50"
              >
                <div
                  className="w-9 h-9 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center shrink-0"
                >
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {a.title}</p>
                  <p className="text-xs text-slate-500">
                    {a.type} · {a.subjectName || a.courseName || "General"}
                  </p>
                </div>
                {a.type === "mcq" || a.type === "quiz" ? (
                  <button onClick={() => nav(`/student/quiz/${a.id}`)}>
                    <Play className="w-3.5 h-3.5" /> Start
                  </button>
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
            <p className="text-sm text-slate-400 text-center py-4">
              Nothing new.
            </p>
          ) : (
            anns.map((a) => (
              <div
                key={a.id}
                className="rounded-xl bg-slate-50 p-3"
              >
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-800 text-sm">
                    {a.title}</p>
                  <Badge
                    tone={
                      a.priority === "critical"
                        ? "rose"
                        : a.priority === "important"
                          ? "amber"
                          : "slate"
                    }
                  >
                    {a.priority}
                  </Badge>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {a.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({
  icon: I,
  label,
  to,
}: any) {
  const nav = useNavigate();
  const tones: Record<string, string> = {
    brand: "bg-brand-100 text-brand-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
  };
  return (
    <button onClick={() => nav(to)} className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-white ring-1 ring-slate-200/70">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones.brand}`}
      >
        <I className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-slate-600">{label}</span>
    </button>
  );
}