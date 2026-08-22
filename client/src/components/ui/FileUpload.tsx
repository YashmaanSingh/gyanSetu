import { useRef, useState, type ReactNode } from "react";
import { UploadCloud, File as FileIcon, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "./Toast";
import { Spinner } from "./misc";

export function FileUpload({
  value,
  onChange,
  accept,
  hint,
  label,
}: {
  value?: { id: string; originalName: string; url?: string } | null;
  onChange: (file: { id: string; originalName: string; url: string } | null) => void;
  accept?: string;
  hint?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await api.upload<{ file: { id: string; originalName: string; url: string } }>(
        "/uploads",
        form
      );
      onChange(res.file);
      toast("File uploaded", "success");
    } catch (err: any) {
      toast(err.message || "Upload failed", "error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      {value ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <FileIcon className="w-5 h-5 text-brand-500" />
          <span className="flex-1 truncate text-sm">{value.originalName}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-slate-400 hover:text-rose-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-slate-500 hover:border-brand-400 hover:text-brand-600"
        >
          {busy ? <Spinner /> : <UploadCloud className="w-7 h-7" />}
          <span className="text-sm font-medium">{busy ? "Uploading…" : "Tap to upload"}</span>
          {hint && <span className="text-xs text-slate-400">{hint}</span>}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handle}
      />
    </div>
  );
}

export function Avatar({
  name,
  src,
  size = "md",
}: {
  name?: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-16 h-16 text-xl" : "w-10 h-10 text-sm";
  const initials = name
    ? name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <div
      className={`${dim} rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold overflow-hidden shrink-0`}
    >
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}
