import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, resolveFileUrl } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Field, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { Avatar, FileUpload } from "@/components/ui/FileUpload";
import { Save, Lock } from "lucide-react";

export default function ProfileView({ title }: { title: string }) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    guardianName: (user as any)?.guardianName ?? "",
    bio: (user as any)?.bio ?? "",
    avatarFileId: user?.avatarFileId ?? null,
  });
  const [avatar, setAvatar] = useState<any>(
    user?.avatarFileId ? { id: user.avatarFileId, originalName: "avatar" } : null
  );
  const [pwd, setPwd] = useState({ current: "", next: "" });
  const [busy, setBusy] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put("/profile", { ...form, avatarFileId: avatar?.id ?? null });
      await refreshUser();
      toast("Profile updated", "success");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function changePwd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/change-password", { currentPassword: pwd.current, newPassword: pwd.next });
      toast("Password changed", "success");
      setPwd({ current: "", next: "" });
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-slate-800">{title}</h1>

      <Card className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <Avatar name={form.name} src={avatar ? resolveFileUrl(`/api/files/${avatar.id}`) : null} size="lg" />
          <div className="flex-1">
            <p className="font-semibold text-slate-800">{user?.name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
        <FileUpload label="Profile photo" value={avatar} onChange={setAvatar} accept="image/*" />

        <form onSubmit={saveProfile} className="space-y-3 mt-4">
          <Field label="Full name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          {(user as any)?.guardianName !== undefined && (
            <Field label="Guardian name">
              <Input value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
            </Field>
          )}
          <Button type="submit" loading={busy}>
            <Save className="w-4 h-4" /> Save profile
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4" /> Change password
        </h3>
        <form onSubmit={changePwd} className="space-y-3">
          <Field label="Current password">
            <Input type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
          </Field>
          <Field label="New password">
            <Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
          </Field>
          <Button type="submit" loading={busy} variant="outline">
            Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}
