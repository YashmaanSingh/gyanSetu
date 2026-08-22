import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, LoadingScreen, ErrorState } from "@/components/ui/misc";
import { BookOpen, ListChecks, Flame, CheckCircle2, TrendingUp } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

export default function StudentProgress() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["my-progress"],
    queryFn: () => api.get<{ progress: any }>("/students/me/progress"),
  });
  const attemptsQ = useQuery({
    queryKey: ["my-attempts-2"],
    queryFn: () => api.get<{ attempts: any[] }>("/quizzes/attempts/mine"),
  });

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorState message="Failed to load progress" onRetry={() => refetch()} />;

  const p = data?.progress ?? {};
  const attempts = attemptsQ.data?.attempts ?? [];

  const cards = [
    { label: "Materials done", value: p.materialsCompleted ?? 0, icon: CheckCircle2, tone: "emerald", sub: `of ${p.totalPublishedMaterials ?? 0}` },
    { label: "Quiz attempts", value: p.quizAttempts ?? 0, icon: ListChecks, tone: "brand", sub: `avg ${Math.round(p.avgPercentage ?? 0)}%` },
    { label: "Daily streak", value: p.dailyStreak ?? 0, icon: Flame, tone: "amber", sub: "days" },
    { label: "Tasks done", value: p.completedActivities ?? 0, icon: TrendingUp, tone: "sky", sub: `of ${p.totalActivities ?? 0}` },
  ];

  const chartData = attempts.slice(0, 10).reverse().map((a: any) => ({
    name: (a.activityTitle || "Quiz").slice(0, 10),
    pct: a.percentage ?? 0,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">My Progress</h1>
        <p className="text-sm text-slate-500">Track your learning journey</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              c.tone === "emerald" ? "bg-emerald-100 text-emerald-600" :
              c.tone === "brand" ? "bg-brand-100 text-brand-600" :
              c.tone === "amber" ? "bg-amber-100 text-amber-600" : "bg-sky-100 text-sky-600"
            }`}>
              <c.icon className="w-5 h-5" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-800">{c.value}</p>
            <p className="text-xs text-slate-500">{c.label} <span className="text-slate-400">· {c.sub}</span></p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Material completion" subtitle="Published vs completed" />
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${p.totalPublishedMaterials ? Math.round((p.materialsCompleted / p.totalPublishedMaterials) * 100) : 0}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-slate-600">
              {p.totalPublishedMaterials ? Math.round((p.materialsCompleted / p.totalPublishedMaterials) * 100) : 0}%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {p.materialsCompleted ?? 0} of {p.totalPublishedMaterials ?? 0} materials completed
          </p>
        </div>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader title="Recent quiz scores" />
          <div className="p-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={chartData[i].pct >= 60 ? "#10b981" : "#f59e0b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Quiz history" subtitle={`${attempts.length} attempts`} />
        <div className="divide-y divide-slate-50">
          {attempts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No quizzes attempted yet.</p>
          ) : (
            attempts.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">{a.activityTitle || "Quiz"}</p>
                  <p className="text-xs text-slate-400">Attempt {a.attemptNo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{a.percentage}%</span>
                  <Badge tone={a.passed ? "emerald" : "rose"}>{a.passed ? "passed" : "failed"}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
