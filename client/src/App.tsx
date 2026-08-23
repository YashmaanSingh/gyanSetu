import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import AdminLayout from "@/components/layouts/AdminLayout";
import StudentLayout from "@/components/layouts/StudentLayout";
import { LoadingScreen } from "@/components/ui/misc";
import type { ReactNode } from "react";

import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/admin/DashboardPage";
import StudentsPage from "@/pages/admin/StudentsPage";
import AdminMaterials from "@/pages/admin/MaterialsPage";
import AdminActivities from "@/pages/admin/ActivitiesPage";
import AdminQuizzes from "@/pages/admin/QuizzesPage";
import AdminAnnouncements from "@/pages/admin/AnnouncementsPage";
import AdminReports from "@/pages/admin/ReportsPage";
import AdminSettings from "@/pages/admin/SettingsPage";
import AdminProfile from "@/pages/admin/ProfilePage";
import AdminDailyTasks from "@/pages/admin/DailyTasksPage";
import AdminDailyTaskEditor from "@/pages/admin/DailyTaskEditorPage";
import AdminDailyTaskResults from "@/pages/admin/DailyTaskResultsPage";
import AdminCurriculum from "@/pages/admin/CurriculumPage";

import StudentDashboard from "@/pages/student/DashboardPage";
import StudentMaterials from "@/pages/student/MaterialsPage";
import StudentActivities from "@/pages/student/ActivitiesPage";
import QuizFlow from "@/pages/student/QuizFlow";
import StudentProgress from "@/pages/student/ProgressPage";
import StudentNotifications from "@/pages/student/NotificationsPage";
import StudentProfile from "@/pages/student/ProfilePage";
import StudentSearch from "@/pages/student/SearchPage";
import StudentLibrary from "@/pages/student/LibraryPage";
import StudentDailyTasks from "@/pages/student/DailyTasksPage";

function RequireAuth({ role, children }: { role: "admin" | "student"; children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (user.role !== role)
    return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/student/dashboard"} replace />;
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/student/dashboard"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <RequireAuth role="admin">
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="materials" element={<AdminMaterials />} />
        <Route path="activities" element={<AdminActivities />} />
        <Route path="quizzes" element={<AdminQuizzes />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="daily-tasks" element={<AdminDailyTasks />} />
        <Route path="daily-tasks/new" element={<AdminDailyTaskEditor />} />
        <Route path="daily-tasks/:id/edit" element={<AdminDailyTaskEditor />} />
        <Route path="daily-tasks/:id/submissions" element={<AdminDailyTaskResults />} />
        <Route path="curriculum" element={<AdminCurriculum />} />
      </Route>

      <Route
        path="/student"
        element={
          <RequireAuth role="student">
            <StudentLayout />
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="materials" element={<StudentMaterials />} />
        <Route path="activities" element={<StudentActivities />} />
        <Route path="quiz/:activityId" element={<QuizFlow />} />
        <Route path="progress" element={<StudentProgress />} />
        <Route path="notifications" element={<StudentNotifications />} />
        <Route path="search" element={<StudentSearch />} />
        <Route path="library" element={<StudentLibrary />} />
        <Route path="daily-tasks" element={<StudentDailyTasks />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
