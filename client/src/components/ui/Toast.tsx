import { createContext, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}
interface ToastCtx {
  toast: (message: string, kind?: ToastKind) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = (message: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, kind, message }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 3500);
  };
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[92%] max-w-sm">
        {items.map((t) => (
          <div
            key={t.id}
            className="animate-fade flex items-start gap-2 rounded-xl bg-white shadow-lg ring-1 ring-black/5 px-3 py-2.5 text-sm"
          >
            {t.kind === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : t.kind === "error" ? (
              <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-brand-500 shrink-0" />
            )}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))}>
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast outside provider");
  return c;
}
