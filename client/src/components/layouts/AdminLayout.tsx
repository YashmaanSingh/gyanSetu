import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarDays,
  ListChecks,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  GraduationCap,
  Search,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { resolveFileUrl } from "@/lib/api";
import { Avatar } from "@/components/ui/FileUpload";

const nav = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/materials", label: "Materials", icon: BookOpen },
  { to: "/admin/activities", label: "Activities", icon: CalendarDays },
  { to: "/admin/quizzes", label: "Quizzes", icon: ListChecks },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-full flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-white border-r border-slate-200">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
            G
          </div>
          <div>
            <p className="font-semibold text-slate-800 leading-tight">GyaanSetu</p>
            <p className="text-xs text-slate-400">Admin</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              <n.icon className="w-5 h-5" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => navigate("/admin/profile")}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-slate-50"
          >
            <Avatar name={user?.name} src={user?.avatarFileId ? resolveFileUrl(`/api/files/${user.avatarFileId}`) : null} />
            <div className="text-left min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </button>
          <button
            onClick={logout}
            className="mt-1 flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-20 flex items-center justify-between bg-white border-b border-slate-200 px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">
              G
            </div>
            <span className="font-semibold">GyaanSetu</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={logout} title="Logout" className="p-2 text-slate-600">
              <LogOut className="w-5 h-5" />
            </button>
            <button onClick={() => navigate("/admin/profile")}>
              <Avatar name={user?.name} src={user?.avatarFileId ? resolveFileUrl(`/api/files/${user.avatarFileId}`) : null} size="sm" />
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 md:px-8 py-5 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200 grid grid-cols-5">
          {nav.slice(0, 5).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                  isActive ? "text-brand-600" : "text-slate-500"
                }`
              }
            >
              <n.icon className="w-5 h-5" />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
