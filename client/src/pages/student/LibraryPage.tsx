import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { contentApi } from "@/lib/api";
import { resolveFileUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { Badge, LoadingScreen, ErrorState, EmptyState } from "@/components/ui/misc";
import {
  ChevronLeft,
  BookOpen,
  FileText,
  Download,
  Eye,
  Search,
  Layers,
  ListTree,
  CheckCircle2,
  Target,
  KeyRound,
  Lightbulb,
  PencilRuler,
  Play,
  Link as LinkIcon,
} from "lucide-react";
import type {
  SubjectRef,
  ChapterRef,
  ChapterDetail,
  ChapterMaterial,
  MyClassResponse,
} from "@/lib/types";

type View = "subjects" | "chapters" | "chapter";

function fmtDur(s?: number | null): string | null {
  if (!s) return null;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function StudentLibrary() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("subjects");
  const [subject, setSubject] = useState<SubjectRef | null>(null);
  const [chapter, setChapter] = useState<ChapterRef | null>(null);
  const [pdf, setPdf] = useState<string | null>(null);
  const [videoMat, setVideoMat] = useState<ChapterMaterial | null>(null);

  const myClass = useQuery<MyClassResponse>({
    queryKey: ["my-class"],
    queryFn: () => contentApi.getMyClass(),
  });

  const chaptersQ = useQuery<{ chapters: ChapterRef[] }>({
    queryKey: ["subject-chapters", subject?.classSubjectId],
    queryFn: () =>
      contentApi.getSubjectChapters(myClass.data!.class!.id, subject!.id),
    enabled: view === "chapters" && !!subject && !!myClass.data?.class,
  });

  const chapterQ = useQuery<{ chapter: ChapterDetail }>({
    queryKey: ["chapter", chapter?.id],
    queryFn: () => contentApi.getChapter(chapter!.id),
    enabled: view === "chapter" && !!chapter,
  });

  if (myClass.isLoading) return <LoadingScreen />;
  if (myClass.error)
    return <ErrorState message="Could not load your class" onRetry={() => myClass.refetch()} />;

  if (!myClass.data?.class) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-800">My Learning Library</h1>
        <Card>
          <EmptyState
            icon={<BookOpen className="w-6 h-6" />}
            title="No class assigned yet"
            description={`Your account (${user?.className || "—"}) is not linked to a class in the curriculum. Please ask your administrator to assign content for your grade.`}
          />
        </Card>
      </div>
    );
  }

  const cls = myClass.data.class;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {view !== "subjects" && (
          <button
            onClick={() => {
              if (view === "chapter") {
                setView("chapters");
                setChapter(null);
              } else {
                setView("subjects");
                setSubject(null);
              }
            }}
            className="p-2 -ml-2 text-slate-500"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {view === "subjects" ? "My Learning Library" : view === "chapters" ? subject?.name : chapter?.title}
          </h1>
          <p className="text-sm text-slate-500">
            {view === "subjects" ? `${cls.name} — choose a subject` : view === "chapters" ? `${cls.name}` : `${cls.name} · ${subject?.name}`}
          </p>
        </div>
      </div>

      {view === "subjects" && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {myClass.data.subjects.map((s) => (
            <Card
              key={s.id}
              className="cursor-pointer hover:ring-2 hover:ring-brand-300 transition"
              onClick={() => {
                setSubject(s);
                setView("chapters");
              }}
            >
              <div className="flex flex-col items-center text-center gap-2 p-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>
                <p className="font-semibold text-slate-800">{s.name}</p>
              </div>
            </Card>
          ))}
          {myClass.data.subjects.length === 0 && (
            <Card>
              <EmptyState icon={<BookOpen className="w-6 h-6" />} title="No subjects yet" />
            </Card>
          )}
        </div>
      )}

      {view === "chapters" && (
        <div className="space-y-2">
          {chaptersQ.isLoading && <LoadingScreen />}
          {chaptersQ.data?.chapters.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:ring-2 hover:ring-brand-300 transition"
              onClick={() => {
                setChapter(c);
                setView("chapter");
              }}
            >
              <div className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold">
                  {c.chapterNo}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{c.title}</p>
                  {c.summary && <p className="text-xs text-slate-500 line-clamp-1">{c.summary}</p>}
                </div>
              </div>
            </Card>
          ))}
          {chaptersQ.data?.chapters.length === 0 && (
            <Card>
              <EmptyState icon={<ListTree className="w-6 h-6" />} title="No chapters yet" />
            </Card>
          )}
        </div>
      )}

      {view === "chapter" && (
        <ChapterView
          data={chapterQ.data?.chapter}
          loading={chapterQ.isLoading}
          onViewPdf={(url) => setPdf(resolveFileUrl(url))}
          onPlay={(m) => setVideoMat(m)}
        />
      )}

      {pdf && (
        <Modal open onClose={() => setPdf(null)} title="Study Material (PDF)" size="lg">
          <iframe src={pdf} className="w-full h-[70vh] rounded-xl border border-slate-200" title="PDF" />
          <div className="flex justify-end mt-3">
            <a href={pdf} target="_blank" rel="noreferrer" download>
              <Button variant="outline">
                <Download className="w-4 h-4" /> Open / Download
              </Button>
            </a>
          </div>
        </Modal>
      )}

      <VideoPlayerModal material={videoMat} onClose={() => setVideoMat(null)} />
    </div>
  );
}

function ChapterView({
  data,
  loading,
  onViewPdf,
  onPlay,
}: {
  data?: ChapterDetail;
  loading: boolean;
  onViewPdf: (url: string) => void;
  onPlay: (m: ChapterMaterial) => void;
}) {
  if (loading) return <LoadingScreen />;
  if (!data) return <ErrorState message="Could not load chapter" />;
  const c = data.content;

  return (
    <div className="space-y-4">
      {c?.intro && (
        <Card>
          <p className="text-sm text-slate-700 leading-relaxed">{c.intro}</p>
        </Card>
      )}

      {c?.objectives?.length ? (
        <Section icon={<Target className="w-4 h-4" />} title="Learning Objectives">
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            {c.objectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {c?.keyPoints?.length ? (
        <Section icon={<KeyRound className="w-4 h-4" />} title="Key Points">
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            {c.keyPoints.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {c?.definitions?.length ? (
        <Section icon={<Lightbulb className="w-4 h-4" />} title="Important Definitions">
          <div className="space-y-2">
            {c.definitions.map((d, i) => (
              <div key={i} className="text-sm">
                <p className="font-semibold text-slate-800">{d.term}</p>
                <p className="text-slate-600">{d.definition}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {c?.examples?.length ? (
        <Section icon={<PencilRuler className="w-4 h-4" />} title="Examples">
          <div className="space-y-2">
            {c.examples.map((e, i) => (
              <div key={i} className="text-sm">
                <p className="font-semibold text-slate-800">{e.question}</p>
                <p className="text-slate-600">{e.solution}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {c?.practiceQuestions?.length ? (
        <Section icon={<CheckCircle2 className="w-4 h-4" />} title="Practice Questions">
          <div className="space-y-2">
            {c.practiceQuestions.map((p, i) => (
              <div key={i} className="text-sm">
                <p className="font-semibold text-slate-800">Q{i + 1}. {p.q}</p>
                <p className="text-slate-600">A. {p.a}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {c?.revision && (
        <Section icon={<BookOpen className="w-4 h-4" />} title="Revision">
          <p className="text-sm text-slate-700 leading-relaxed">{c.revision}</p>
        </Section>
      )}

      <div>
        <h3 className="font-semibold text-slate-800 mb-2">Study Materials</h3>
        {data.studyMaterials.length === 0 ? (
          <Card>
            <EmptyState icon={<FileText className="w-6 h-6" />} title="No study materials yet" />
          </Card>
        ) : (
            <div className="grid grid-cols-1 gap-2">
            {data.studyMaterials.map((m) => (
              <Card key={m.id} className="p-3">
                <div className="flex items-center gap-3">
                  {m.thumbnailUrl ? (
                    <img src={resolveFileUrl(m.thumbnailUrl)} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                      {m.type === "video" ? (
                        <Play className="w-5 h-5" />
                      ) : m.type === "link" ? (
                        <LinkIcon className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate">{m.title}</p>
                    {m.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{m.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge tone="brand">{m.type}</Badge>
                      {m.type === "video" && <Badge tone="sky">{m.videoSource || "upload"}</Badge>}
                      {m.durationSeconds ? <Badge tone="slate">{fmtDur(m.durationSeconds)}</Badge> : null}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {m.type === "video" && (
                      <Button size="sm" variant="outline" onClick={() => onPlay(m)}>
                        <Play className="w-3.5 h-3.5" /> Watch
                      </Button>
                    )}
                    {m.type === "link" && m.url && (
                      <a href={m.url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline">
                          <LinkIcon className="w-3.5 h-3.5" /> Open
                        </Button>
                      </a>
                    )}
                    {m.fileUrl && m.type !== "video" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => onViewPdf(m.fileUrl!)}>
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                        <a href={resolveFileUrl(m.fileUrl)} target="_blank" rel="noreferrer" download>
                          <Button size="sm">
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-2 text-brand-700 font-semibold">
        {icon}
        {title}
      </div>
      {children}
    </Card>
  );
}
