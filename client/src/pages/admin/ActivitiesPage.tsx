import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge, LoadingScreen, ErrorState, Pagination, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import { ActivityForm } from "@/components/ActivityForm";
import { fmtDate } from "@/lib/format";
import type { Activity } from "@/lib/types";

export default function AdminActivities() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["activities-admin", page],
    queryFn: () => api.get<{ activities: Activity[]; pagination: any }>("/activities", { page, pageSize: 12 }),
  });
  const subjectsQ = useQuery({ queryKey: ["subjects"], queryFn: () => api.get<{ subjects: any[] }>("/meta/subjects") });
  const coursesQ = useQuery({ queryKey: ["courses"], queryFn: () => api.get<{ courses: any[] }>("/meta/courses") });

  async function remove(a: Activity) {
    if (!confirm(`Delete "${a.title}"?`)) return;
    try {
      await api.del(`/activities/${a.id}`);
      toast("Activity deleted", "success");
      qc.invalidateQueries({ queryKey: ["activities-admin"] });
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorState message="Failed to load activities" onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Activities</h1>
          <p className="text-sm text-slate-500">Daily tasks, readings & quizzes</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {data?.activities.length === 0 ? (
        <Card>
          <EmptyState icon={<CalendarDays className="w-6 h-6" />} title="No activities" description="Create tasks and quizzes." />
        </Card>
      ) : (
        <div className="space-y-2">
          {data?.activities.map((a) => (
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
                <p className="text-xs text-slate-500 truncate">{a.subjectName || a.courseName || "General"} · {fmtDate(a.activityDate)}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setEditing(a); setOpen(true); }}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
              <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => remove(a)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={setPage} />

      {open && (
        <Modal open onClose={() => setOpen(false)} title={editing ? "Edit activity" : "Add activity"} size="lg">
          <ActivityForm
            activity={editing}
            subjects={subjectsQ.data?.subjects ?? []}
            courses={coursesQ.data?.courses ?? []}
            onClose={() => setOpen(false)}
            onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["activities-admin"] }); }}
          />
        </Modal>
      )}
    </div>
  );
}
