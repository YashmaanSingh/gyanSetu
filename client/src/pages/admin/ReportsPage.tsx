import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen, ErrorState, Badge } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { API_URL } from "@/lib/api";
import { Download, Users, BookOpen, ListChecks } from "lucide-react";

export default function AdminReports() {
  const { toast } = useToast();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports-students"],
    queryFn: () => api.get<{ report: any[] }>("/admin/reports/students"),
  });

  function download(path: string, name: string) {
    const url = `${API_URL}${path}?format=csv`;
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("Download started", "info");
  }

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorState message="Failed to load reports" onRetry={() => refetch()} />;

  const rows = data?.report ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Reports</h1>
        <p className="text-sm text-slate-500">Performance & exports</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Student report</p>
            <Button variant="outline" size="sm" className="mt-1" onClick={() => download("/admin/reports/students", "students.csv")}>
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Materials report</p>
            <Button variant="outline" size="sm" className="mt-1" onClick={() => download("/admin/reports/materials", "materials.csv")}>
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <ListChecks className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Quiz report</p>
            <Button variant="outline" size="sm" className="mt-1" onClick={() => download("/admin/reports/quizzes", "quizzes.csv")}>
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Student performance" subtitle={`${rows.length} students`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2 font-medium">Student</th>
                <th className="px-4 py-2 font-medium">Course</th>
                <th className="px-4 py-2 font-medium">Attempts</th>
                <th className="px-4 py-2 font-medium">Avg score</th>
                <th className="px-4 py-2 font-medium">Materials viewed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-700">{r.name}</p>
                    <p className="text-xs text-slate-400">{r.studentCode}</p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{r.courseName || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.quizAttempts}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={r.avgScore >= 60 ? "emerald" : "amber"}>{Math.round(r.avgScore ?? 0)}%</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{r.materialsViewed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
