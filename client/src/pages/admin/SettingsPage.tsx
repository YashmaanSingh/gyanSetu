import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { LoadingScreen, ErrorState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { Save } from "lucide-react";

type Group = "platform" | "quiz" | "notifications" | "uploads";

export default function AdminSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api.get<{ settings: any }>("/admin/settings"),
  });

  const [form, setForm] = useState<any>({
    platform: {},
    quiz: {},
    notifications: {},
    uploads: {},
  });

  useEffect(() => {
    if (data?.settings) {
      setForm({
        platform: data.settings.platform ?? {},
        quiz: data.settings.quiz ?? {},
        notifications: data.settings.notifications ?? {},
        uploads: data.settings.uploads ?? {},
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: (group: Group) =>
      api.put("/admin/settings", { group, ...form[group] }),
    onSuccess: () => {
      toast("Settings saved", "success");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e: any) => toast(e?.message || "Failed to save", "error"),
  });

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorState message="Failed to load settings" onRetry={() => refetch()} />;

  const set = (g: Group, k: string, v: any) =>
    setForm((f: any) => ({ ...f, [g]: { ...f[g], [k]: v } }));

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Settings</h1>

      <Card className="p-4 space-y-4">
        <CardHeader title="Platform" />
        <Field label="Platform name">
          <Input value={form.platform.platformName ?? ""} onChange={(e) => set("platform", "platformName", e.target.value)} />
        </Field>
        <Field label="Tagline">
          <Input value={form.platform.platformTagline ?? ""} onChange={(e) => set("platform", "platformTagline", e.target.value)} />
        </Field>
        <Field label="Theme color">
          <Input value={form.platform.themeColor ?? ""} onChange={(e) => set("platform", "themeColor", e.target.value)} placeholder="#4f46e5" />
        </Field>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate("platform")} disabled={save.isPending}>
            <Save className="w-4 h-4" /> Save platform
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <CardHeader title="Quiz defaults" />
        <Field label="Default time limit (minutes)">
          <Input type="number" value={form.quiz.defaultTimeLimit ?? ""} onChange={(e) => set("quiz", "defaultTimeLimit", Number(e.target.value))} />
        </Field>
        <Field label="Default max attempts">
          <Input type="number" value={form.quiz.defaultMaxAttempts ?? ""} onChange={(e) => set("quiz", "defaultMaxAttempts", Number(e.target.value))} />
        </Field>
        <Field label="Default passing score (%)">
          <Input type="number" value={form.quiz.defaultPassingScore ?? ""} onChange={(e) => set("quiz", "defaultPassingScore", Number(e.target.value))} />
        </Field>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate("quiz")} disabled={save.isPending}>
            <Save className="w-4 h-4" /> Save quiz defaults
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <CardHeader title="Notifications" />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="rounded border-slate-300"
            checked={!!form.notifications.notificationsEnabled}
            onChange={(e) => set("notifications", "notificationsEnabled", e.target.checked)}
          />
          Enable student notifications
        </label>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate("notifications")} disabled={save.isPending}>
            <Save className="w-4 h-4" /> Save notifications
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <CardHeader title="Uploads" />
        <Field label="Max file size (MB)">
          <Input type="number" value={form.uploads.maxSizeMb ?? ""} onChange={(e) => set("uploads", "maxSizeMb", Number(e.target.value))} />
        </Field>
        <Field label="Allowed extensions (comma separated)">
          <Input value={form.uploads.allowedExtensions ?? ""} onChange={(e) => set("uploads", "allowedExtensions", e.target.value)} placeholder="pdf,docx,png,jpg" />
        </Field>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate("uploads")} disabled={save.isPending}>
            <Save className="w-4 h-4" /> Save uploads
          </Button>
        </div>
      </Card>
    </div>
  );
}
