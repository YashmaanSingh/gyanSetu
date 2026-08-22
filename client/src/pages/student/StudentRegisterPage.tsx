import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

type Errors = Record<string, string>;

export default function StudentRegisterPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: coursesData } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.get<{ courses: { id: string; name: string }[] }>("/meta/courses"),
  });
  const courses = coursesData?.courses ?? [];

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    studentCode: "",
    courseId: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (!/^[+]?[0-9]{10,15}$/.test(form.phone.trim()))
      e.phone = "Enter a valid mobile number (10–15 digits)";
    if (!form.studentCode.trim()) e.studentCode = "Student ID / enrollment number is required";
    if (!form.courseId) e.courseId = "Please select a course / class";
    if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (form.confirmPassword !== form.password) e.confirmPassword = "Passwords do not match";
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      const res = await api.post<{ accessToken: string; user: any }>("/students/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        studentCode: form.studentCode.trim(),
        courseId: form.courseId,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      toast("Account created successfully", "success");
      if (res.accessToken && res.user) {
        setSession(res.user, res.accessToken);
        navigate("/student/dashboard", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    } catch (err: any) {
      toast(err.message || "Registration failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-b from-brand-50 to-slate-50">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-800">GyaanSetu</h1>
          <p className="text-sm text-slate-500">Create your student account</p>
        </div>

        <Card className="p-5">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="Full Name" error={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Your full name"
                autoCapitalize="words"
                autoComplete="name"
              />
            </Field>

            <Field label="Email" error={errors.email}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoComplete="email"
              />
            </Field>

            <Field label="Mobile Number" error={errors.phone}>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="9876543210"
                inputMode="tel"
                autoComplete="tel"
              />
            </Field>

            <Field label="Student ID / Enrollment Number" error={errors.studentCode}>
              <Input
                value={form.studentCode}
                onChange={(e) => set("studentCode", e.target.value)}
                placeholder="GS-2026-004"
                autoCapitalize="characters"
              />
            </Field>

            <Field label="Course / Class" error={errors.courseId}>
              <Select value={form.courseId} onChange={(e) => set("courseId", e.target.value)}>
                <option value="">Select course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Password" error={errors.password}>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm Password" error={errors.confirmPassword}>
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </Field>
            </div>

            <Button type="submit" fullWidth size="lg" loading={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create Account
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-600 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
