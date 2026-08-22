import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge, LoadingScreen, ErrorState, Pagination, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import { fmtDate } from "@/lib/format";
import type { Announcement } from "@/lib/types";

export default function AdminAnnouncements() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["announcements-admin", page],
    queryFn: () => api.get<{ announcements: Announcement[]; pagination: any }>("/announcements", { page, pageSize: 12 }),
  });

  async function remove(a: Announcement) {
    if (!confirm(`Delete "${a.title}"?`)) return;
    try {
      await api.del(`/announcements/${a.id}`);
      toast("Announcement deleted", "success");
      qc.invalidateQueries({ queryKey: ["announcements-admin"] });
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorState message="Failed to load announcements" onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Announcements</h1>
          <p className="text-sm text-slate-500">Broadcast to students</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {data?.announcements.length === 0 ? (
        <Card>
          <EmptyState icon={<Megaphone className="w-6 h-6" />} title="No announcements" />
        </Card>
      ) : (
        <div className="space-y-2">
          {data?.announcements.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">{a.title}</p>
                    <Badge tone={a.priority === "critical" ? "rose" : a.priority === "important" ? "amber" : "slate"}>
                      {a.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{a.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    To: {a.targetRole} · {fmtDate(a.publishDate)} {a.expiryDate ? `– ${fmtDate(a.expiryDate)}` : ""}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(a); setOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => remove(a)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={setPage} />

      {open && (
        <AnnouncementForm
          announcement={editing}
          onClose={() => setOpen(false)}
          onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["announcements-admin"] }); }}
        />
      )}
    </div>
  );
}

function AnnouncementForm({ announcement, onClose, onDone }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: announcement?.title ?? "",
    message: announcement?.message ?? "",
    priority: announcement?.priority ?? "normal",
    targetRole: announcement?.targetRole ?? "all",
    publishDate: announcement?.publishDate ?? new Date().toISOString().slice(0, 10),
    expiryDate: announcement?.expiryDate ?? "",
  });
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (announcement) await api.put(`/announcements/${announcement.id}`, form);
      else await api.post("/announcements", form);
      toast("Saved", "success");
      onDone();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={announcement ? "Edit announcement" : "New announcement"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy}>Publish</Button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-3">
        <Field label="Title">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </Field>
        <Field label="Message">
          <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="normal">normal</option>
              <option value="important">important</option>
              <option value="critical">critical</option>
            </Select>
          </Field>
          <Field label="Audience">
            <Select value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })}>
              <option value="all">All</option>
              <option value="students">Students</option>
              <option value="admins">Admins</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Publish date">
            <Input type="date" value={form.publishDate} onChange={(e) => setForm({ ...form, publishDate: e.target.value })} />
          </Field>
          <Field label="Expiry date">
            <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
