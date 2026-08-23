import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  Home,
  BookOpen,
  CalendarDays,
  ListChecks,
  Bell,
  User,
  Search,
  Library,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui/FileUpload";
import { api, resolveFileUrl } from "@/lib/api";
import { useEffect, useState } from "react";

const nav = [
  { to: "/student/dashboard", label: "Home", icon: Home },
  { to: "/student/library", label: "Library", icon: Library },
  { to: "/student/materials", label: "Study", icon: BookOpen },
  { to: "/student/daily-tasks", label: "Tasks", icon: CalendarDays },
  { to: "/student/search", label: "Search", icon: Search },
  { to: "/student/profile", label: "Me", icon: User },
];

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    api
      .get<{ count: number }>("/notifications/unread-count")
      .then((r) => active && setUnread(r.count))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-full flex flex-col bg-slate-50">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-white border-b border-slate-200 px-4 h-14">
        <button onClick={() => navigate("/student/dashboard")} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">
            G
          </div>
          <span className="font-semibold text-slate-800">GyaanSetu</span>
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate("/student/notifications")} className="relative p-2 text-slate-600">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
          <button onClick={handleLogout} title="Logout" className="p-2 text-slate-600">
            <LogOut className="w-5 h-5" />
          </button>
          <button onClick={() => navigate("/student/profile")}>
            <Avatar name={user?.name} src={user?.avatarFileId ? resolveFileUrl(`/api/files/${user.avatarFileId}`) : null} size="sm" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-2xl w-full mx-auto pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200 grid grid-cols-6 max-w-2xl mx-auto">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 py-2 text-[10px] ${
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
  );
}
