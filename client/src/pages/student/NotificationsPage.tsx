import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen, ErrorState, EmptyState, Badge } from "@/components/ui/misc";
import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fmtDateTime } from "@/lib/format";
import type { Notification } from "@/lib/types";

export default function StudentNotifications() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => api.get<{ notifications: Notification[]; pagination: any }>("/notifications", { page, pageSize: 20 }),
  });

  async function markAll() {
    try {
      await api.post("/notifications/read-all", {});
      qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      /* noop */
    }
  }
  async function markOne(n: Notification) {
    if (n.isRead) {
      if (n.linkUrl) nav(n.linkUrl);
      return;
    }
    try {
      await api.post(`/notifications/${n.id}/read`, {});
      qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      /* noop */
    }
  }

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorState message="Failed to load" onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Notifications</h1>
        <Button variant="ghost" size="sm" onClick={markAll}>
          <CheckCheck className="w-4 h-4" /> Mark all read
        </Button>
      </div>

      {data?.notifications.length === 0 ? (
        <Card>
          <EmptyState icon={<Bell className="w-6 h-6" />} title="No notifications" />
        </Card>
      ) : (
        <div className="space-y-2">
          {data?.notifications.map((n) => (
            <Card
              key={n.id}
              className={`p-4 flex gap-3 cursor-pointer ${n.isRead ? "" : "ring-1 ring-brand-200"}`}
              onClick={() => markOne(n)}
            >
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.isRead ? "bg-transparent" : "bg-brand-500"}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-800 text-sm">{n.title}</p>
                  <Badge tone="slate">{n.type}</Badge>
                </div>
                {n.body && <p className="text-sm text-slate-600 mt-0.5">{n.body}</p>}
                <p className="text-xs text-slate-400 mt-1">{fmtDateTime(n.createdAt)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
