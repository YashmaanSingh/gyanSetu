import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/misc";
import { api } from "@/lib/api";
import type { ChapterMaterial } from "@/lib/types";

function toEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const ytShort = url.match(/youtube\.com\/embed\/([\w-]+)/);
  if (ytShort) return url;
  return url;
}

function fmtDuration(s?: number | null): string | null {
  if (!s) return null;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function VideoPlayerModal({
  material,
  onClose,
}: {
  material: ChapterMaterial | null;
  onClose: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!material) return;
    const m = material;
    let revoked: string | null = null;
    let cancelled = false;

    async function load() {
      setError(null);
      if (m.type === "video" && m.videoSource === "upload" && m.fileUrl) {
        setLoading(true);
        try {
          const obj = await api.blob(m.fileUrl);
          if (!cancelled) {
            setSrc(obj);
            revoked = obj;
          }
        } catch (e: any) {
          if (!cancelled) setError(e.message || "Failed to load video");
        } finally {
          if (!cancelled) setLoading(false);
        }
      } else if (m.url) {
        setSrc(toEmbedUrl(m.url));
      } else {
        setError("No video source available");
      }
    }
    load();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [material]);

  if (!material) return null;

  return (
    <Modal open onClose={onClose} title={material.title} size="lg">
      <div className="space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-10 text-slate-500">
            <Spinner className="w-6 h-6" /> <span className="ml-2">Loading video…</span>
          </div>
        )}
        {error && <p className="text-sm text-rose-600 text-center py-8">{error}</p>}
        {!loading && !error && src && material.type === "video" && material.videoSource === "upload" && (
          <video src={src} controls className="w-full rounded-xl bg-black" style={{ maxHeight: "70vh" }} />
        )}
        {!loading && !error && src && (material.url || material.type === "link") && (
          <iframe
            src={src}
            title={material.title}
            className="w-full rounded-xl bg-black"
            style={{ height: "70vh", border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}
        {material.durationSeconds ? (
          <p className="text-xs text-slate-500">Duration: {fmtDuration(material.durationSeconds)}</p>
        ) : null}
      </div>
    </Modal>
  );
}
