import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge, LoadingScreen, ErrorState, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { Plus, Pencil, ListChecks } from "lucide-react";
import { ActivityForm } from "@/components/ActivityForm";
import type { Activity } from "@/lib/types";

export default function AdminQuizzes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["quizzes-admin"],
    queryFn: () => api.get<{ activities: Activity[]; pagination: any }>("/activities", { page: 1, pageSize: 100 }),
  });
  const subjectsQ = useQuery({ queryKey: ["subjects"], queryFn: () => api.get<{ subjects: any[] }>("/meta/subjects") });
  const coursesQ = useQuery({ queryKey: ["courses"], queryFn: () => api.get<{ courses: any[] }>("/meta/courses") });

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorState message="Failed to load quizzes" onRetry={() => refetch()} />;

  const quizzes = (data?.activities ?? []).filter((a) => a.type === "mcq" || a.type === "quiz");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Quizzes</h1>
          <p className="text-sm text-slate-500">MCQ & quiz builder</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> New quiz
        </Button>
      </div>

      {quizzes.length === 0 ? (
        <Card>
          <EmptyState icon={<ListChecks className="w-6 h-6" />} title="No quizzes yet" description="Create a quiz from the activity form." />
        </Card>
      ) : (
        <div className="space-y-2">
          {quizzes.map((a) => (
            <Card key={a.id} className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <ListChecks className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800 truncate">{a.title}</p>
                  <Badge tone={a.status === "published" ? "emerald" : "amber"}>{a.status}</Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {a.questionCount ?? 0} questions · {a.timeLimitMinutes ?? 10} min · pass {a.passingScore ?? 50}%
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setEditing(a); setOpen(true); }}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <Modal open onClose={() => setOpen(false)} title={editing ? "Edit quiz" : "New quiz"} size="lg">
          <ActivityForm
            activity={editing}
            subjects={subjectsQ.data?.subjects ?? []}
            courses={coursesQ.data?.courses ?? []}
            onClose={() => setOpen(false)}
            onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["quizzes-admin"] }); }}
          />
        </Modal>
      )}
    </div>
  );
}
