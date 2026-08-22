import { type ReactNode } from "react";
import { Loader2, Inbox, AlertTriangle } from "lucide-react";

export function Spinner({ className = "w-5 h-5" }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin text-brand-500`} />;
}

export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-slate-500">
      <Spinner className="w-8 h-8" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "brand" | "emerald" | "amber" | "rose" | "sky";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    brand: "bg-brand-100 text-brand-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    sky: "bg-sky-100 text-sky-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <p className="font-medium text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-400 max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-500">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <p className="text-sm text-slate-600 max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-medium text-brand-600 hover:underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 py-3">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-3 py-1.5 rounded-lg text-sm bg-slate-100 disabled:opacity-40"
      >
        Prev
      </button>
      <span className="text-sm px-2 text-slate-500">
        {page} / {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="px-3 py-1.5 rounded-lg text-sm bg-slate-100 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
