import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { dailyTaskApi, dailyTaskTypeLabels, contentApi } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Badge, LoadingScreen, ErrorState, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { CalendarPlus, Eye, Pencil, Trash2, CheckCircle2, XCircle, Users } from "lucide-react";
import type { DailyTaskListItem, DailyTaskType } from "@/lib/types";

export default function AdminDailyTasks() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState<Record<string, string>>({});

  const classesQ = useQuery({ queryKey: ["admin-classes"], queryFn: () => contentApi.listClasses() });
  const tasksQ = useQuery({
    queryKey: ["admin-daily-tasks", filters],
    queryFn: () => dailyTaskApi.list(filters),
  });

  async function setStatus(t: DailyTaskListItem, status: "draft" | "published" | "archived") {
    try {
      await dailyTaskApi.publish(t.id, status);
      toast(status === "published" ? "Task published" : "Status updated", "success");
      qc.invalidateQueries({ queryKey: ["admin-daily-tasks"] });
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function remove(t: DailyTaskListItem) {
    if (!confirm(`Delete "${t.title}"? This archives the task.`)) return;
    try {
      await dailyTaskApi.remove(t.id);
      toast("Task archived", "success");
      qc.invalidateQueries({ queryKey: ["admin-daily-tasks"] });
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  if (tasksQ.isLoading) return <LoadingScreen />;
  if (tasksQ.error) return <ErrorState message="Failed to load tasks" onRetry={() => tasksQ.refetch()} />;

  const tasks = tasksQ.data?.tasks ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Daily Tasks</h1>
          <p className="text-sm text-slate-500">Create and manage short daily learning activities</p>
        </div>
        <Button onClick={() => nav("/admin/daily-tasks/new")}>
          <CalendarPlus className="w-4 h-4" /> New Task
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3">
          <Select value={filters.classId || ""} onChange={(e) => setFilters({ ...filters, classId: e.target.value })}>
            <option value="">All classes</option>
            {(classesQ.data?.classes ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select value={filters.status || ""} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
          <Select value={filters.type || ""} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All types</option>
            {(Object.keys(dailyTaskTypeLabels) as DailyTaskType[]).map((k) => (
              <option key={k} value={k}>{dailyTaskTypeLabels[k]}</option>
            ))}
          </Select>
          <Select value={filters.date || ""} onChange={(e) => setFilters({ ...filters, date: e.target.value })}>
            <option value="">All dates</option>
            <option value={new Date().toISOString().slice(0, 10)}>Today</option>
          </Select>
        </div>
      </Card>

      {tasks.length === 0 ? (
        <Card>
          <EmptyState icon={<CalendarPlus className="w-6 h-6" />} title="No daily tasks yet" description="Create your first daily task for a class." />
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <Card key={t.id}>
              <div className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 truncate">{t.title}</p>
                    <Badge tone="brand">{dailyTaskTypeLabels[t.type]}</Badge>
                    <Badge tone={t.status === "published" ? "emerald" : t.status === "archived" ? "slate" : "amber"}>{t.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.className} · {t.subjectName || "No subject"} · {t.taskDate} · {t.questionCount} Q · {t.totalMarks} marks
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" title="View submissions" onClick={() => nav(`/admin/daily-tasks/${t.id}/submissions`)}>
                    <Users className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" title="Edit" onClick={() => nav(`/admin/daily-tasks/${t.id}/edit`)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  {t.status === "published" ? (
                    <Button size="sm" variant="ghost" title="Unpublish" onClick={() => setStatus(t, "draft")}>
                      <XCircle className="w-4 h-4 text-amber-600" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" title="Publish" onClick={() => setStatus(t, "published")}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" title="Delete" onClick={() => remove(t)}>
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
