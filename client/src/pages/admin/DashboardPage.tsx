import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { LoadingScreen, ErrorState, Badge } from "@/components/ui/misc";
import { Users, BookOpen, CalendarDays, ListChecks, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { DashboardStats } from "@/lib/types";

export default function AdminDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.get<{ stats: DashboardStats; platform: any }>("/admin/dashboard"),
  });

  if (isLoading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message="Failed to load dashboard" onRetry={() => refetch()} />;

  const s = data.stats;
  const cards = [
    { label: "Students", value: s.totalStudents, icon: Users, tone: "brand" },
    { label: "Materials", value: s.totalMaterials, icon: BookOpen, tone: "sky" },
    { label: "Today's tasks", value: s.todaysActivities, icon: CalendarDays, tone: "amber" },
    { label: "Quiz attempts", value: s.quizAttempts, icon: ListChecks, tone: "emerald" },
  ];
  const toneCls: Record<string, string> = {
    brand: "bg-brand-100 text-brand-700",
    sky: "bg-sky-100 text-sky-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">Platform overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneCls[c.tone]}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-800">{c.value}</p>
            <p className="text-xs text-slate-500">{c.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Material views (7 days)" subtitle="Total vs completed" />
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.completionLast7}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#4f46e5" fill="url(#g)" />
                <Area type="monotone" dataKey="completed" stroke="#10b981" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Quiz attempts (14 days)" subtitle="Submissions over time" />
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.attemptsLast14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-4 flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-emerald-500" />
        <div>
          <p className="text-sm font-medium text-slate-700">Average quiz score</p>
          <p className="text-2xl font-bold text-slate-800">{s.avgScore}%</p>
        </div>
        <div className="ml-auto">
          <Badge tone="emerald">{s.activeStudents} active students</Badge>
        </div>
      </Card>
    </div>
  );
}
