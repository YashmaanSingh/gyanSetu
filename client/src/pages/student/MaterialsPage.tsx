import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, resolveFileUrl } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge, LoadingScreen, ErrorState, Pagination, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { FileText, BookOpen, Link2, Search, CheckCircle2, Eye } from "lucide-react";
import { MATERIAL_TYPES } from "@/lib/format";
import type { Material } from "@/lib/types";

const TABS = [
  { value: "", label: "All" },
  { value: "note", label: "Notes" },
  { value: "book", label: "Books" },
  { value: "pdf", label: "PDFs" },
  { value: "document", label: "Docs" },
  { value: "video", label: "Videos" },
  { value: "link", label: "Links" },
];

export default function StudentMaterials() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("");
  const [detail, setDetail] = useState<Material | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["materials-student", page, q, tab],
    queryFn: () => api.get<{ materials: Material[]; pagination: any }>("/materials", { page, pageSize: 12, q, type: tab }),
  });

  async function complete(m: Material) {
    try {
      await api.post(`/materials/${m.id}/complete`, {});
      toast("Marked as complete", "success");
      qc.invalidateQueries({ queryKey: ["materials-student"] });
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorState message="Failed to load materials" onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Study Materials</h1>
        <p className="text-sm text-slate-500">Notes, books & resources</p>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTab(t.value); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap ${
              tab === t.value ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search materials…"
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pl-9 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      {data?.materials.length === 0 ? (
        <Card>
          <EmptyState icon={<BookOpen className="w-6 h-6" />} title="No materials found" />
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {data?.materials.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              {m.thumbnailUrl ? (
                <img src={resolveFileUrl(m.thumbnailUrl)} alt="" className="h-28 w-full object-cover" />
              ) : (
                <div className="h-28 w-full bg-gradient-to-br from-brand-100 to-sky-100 flex items-center justify-center text-brand-500">
                  {m.type === "book" ? <BookOpen className="w-9 h-9" /> : m.type === "link" ? <Link2 className="w-9 h-9" /> : <FileText className="w-9 h-9" />}
                </div>
              )}
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <Badge tone="brand">{m.type}</Badge>
                  {m.completed && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
                <p className="mt-1 font-semibold text-slate-800 line-clamp-2 text-sm h-9">{m.title}</p>
                <p className="text-xs text-slate-500">{m.subjectName || m.courseName || "General"}</p>
                <div className="flex gap-1 mt-3">
                  <Button size="sm" fullWidth onClick={() => setDetail(m)}>
                    <Eye className="w-3.5 h-3.5" /> Open
                  </Button>
                  {!m.completed && (
                    <Button variant="outline" size="sm" onClick={() => complete(m)} title="Mark complete">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={setPage} />

      {detail && (
        <MaterialViewer material={detail} onClose={() => setDetail(null)} onComplete={() => { complete(detail); setDetail(null); }} />
      )}
    </div>
  );
}

function MaterialViewer({ material, onClose, onComplete }: any) {
  const resolvedFile = resolveFileUrl(material.fileUrl);
  const isPdf = resolvedFile && (resolvedFile.endsWith(".pdf") || material.type === "pdf");
  return (
    <Modal open onClose={onClose} title={material.title} size="lg">
      <div className="space-y-3">
        <p className="text-sm text-slate-500">{material.description}</p>
        {resolvedFile ? (
          isPdf ? (
            <iframe src={resolvedFile} className="w-full h-[60vh] rounded-xl border border-slate-200" title={material.title} />
          ) : (
            <div className="rounded-xl bg-slate-50 p-4 text-center">
              <p className="text-sm text-slate-600 mb-2">Open the file to study</p>
              <a href={resolvedFile} target="_blank" rel="noreferrer">
                <Button>Download / Open file</Button>
              </a>
            </div>
          )
        ) : material.externalUrl ? (
          <a href={material.externalUrl} target="_blank" rel="noreferrer" className="block">
            <Button fullWidth>Open external link</Button>
          </a>
        ) : (
          <p className="text-sm text-slate-400">No file attached.</p>
        )}
        <div className="flex justify-end gap-2">
          {!material.completed && (
            <Button variant="outline" onClick={onComplete}>
              <CheckCircle2 className="w-4 h-4" /> Mark complete
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
