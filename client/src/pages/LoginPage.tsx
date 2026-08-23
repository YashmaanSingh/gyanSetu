import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GraduationCap, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { Loader2 } from "lucide-react";

type Role = "admin" | "student";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [role, setRole] = useState<Role>("student");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(role, { identifier, password });
      const to = (loc.state as any)?.from as string | undefined;
      navigate(to && to.startsWith(`/${role}`) ? to : `/${role}/dashboard`, { replace: true });
    } catch (err: any) {
      toast(err.message || "Login failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-b from-brand-50 to-slate-50">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-800">GyaanSetu</h1>
          <p className="text-sm text-slate-500">Student Learning Portal</p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {(["student", "admin"] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`py-2.5 rounded-xl text-sm font-medium capitalize transition ${
                role === r ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <Card className="p-5">
          <form onSubmit={submit} className="space-y-4">
            <Field label={role === "admin" ? "Email" : "Email or Student ID"}>
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={role === "admin" ? "admin@gyaansetu.app" : "yashmaan@… or GS-2026-001"}
                autoCapitalize="none"
                autoComplete="username"
                required
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </Field>
            <Button type="submit" fullWidth size="lg" loading={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Sign in as {role}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
