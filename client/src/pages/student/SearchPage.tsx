import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { LoadingScreen, ErrorState, EmptyState, Badge } from "@/components/ui/misc";
import { Search, BookOpen, CalendarDays, Megaphone, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fmtDate } from "@/lib/format";

export default function StudentSearch() {
  const nav = useNavigate();
  const [q, setQ] = useState("");

  const { data, isFetching, error } = useQuery({
    queryKey: ["search", q],
    queryFn: () => api.get<any>("/search", { q }),
    enabled: q.trim().length > 0,
  });

  const r = data?.results;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Search</h1>
        <p className="text-sm text-slate-500">Find materials, tasks & people</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type to search…"
          autoFocus
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 pl-9 text-sm focus:border-brand-500 focus:outline-none"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-3 top-3 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!q.trim() && (
        <Card>
          <EmptyState icon={<Search className="w-6 h-6" />} title="Start typing to search" description="Materials, activities and students" />
        </Card>
      )}

      {isFetching && <LoadingScreen label="Searching…" />}
      {error && <ErrorState message="Search failed" />}

      {q.trim() && r && (
        <div className="space-y-4">
          <Section
            icon={<BookOpen className="w-4 h-4" />}
            title="Materials"
            empty="No materials found"
            items={r.materials}
          >
            {(m: any) => (
              <Card key={m.id} className="p-3 flex items-center gap-2 cursor-pointer" onClick={() => nav("/student/materials")}>
                <Badge tone="brand">{m.type}</Badge>
                <p className="text-sm text-slate-700 flex-1 truncate">{m.title}</p>
              </Card>
            )}
          </Section>

          <Section
            icon={<CalendarDays className="w-4 h-4" />}
            title="Activities"
            empty="No activities found"
            items={r.activities}
          >
            {(a: any) => (
              <Card key={a.id} className="p-3 flex items-center gap-2 cursor-pointer" onClick={() => nav("/student/activities")}>
                <Badge tone="brand">{a.type}</Badge>
                <p className="text-sm text-slate-700 flex-1 truncate">{a.title}</p>
                <span className="text-xs text-slate-400">{fmtDate(a.activityDate)}</span>
              </Card>
            )}
          </Section>

          <Section
            icon={<Megaphone className="w-4 h-4" />}
            title="Announcements"
            empty="No announcements found"
            items={r.announcements}
          >
            {(a: any) => (
              <Card key={a.id} className="p-3">
                <p className="text-sm font-medium text-slate-700">{a.title}</p>
                <p className="text-xs text-slate-500">{a.message}</p>
              </Card>
            )}
          </Section>

          <Section
            icon={<Search className="w-4 h-4" />}
            title="Students"
            empty="No students found"
            items={r.students}
          >
            {(s: any) => (
              <Card key={s.id} className="p-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                  {s.name?.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.studentCode} · {s.courseName}</p>
                </div>
              </Card>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ icon: I, title, empty, items, children }: any) {
  const list = items ?? [];
  return (
    <div>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 mb-2">
        <I className="w-4 h-4 text-brand-500" /> {title}
      </p>
      <div className="space-y-2">
        {list.length === 0 ? (
          <p className="text-sm text-slate-400">{empty}</p>
        ) : (
          list.map((it: any) => children(it))
        )}
      </div>
    </div>
  );
}
