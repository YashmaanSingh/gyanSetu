export function fmtDate(s?: string | null, withYear = true) {
  if (!s) return "—";
  const d = new Date(s.includes("T") ? s : `${s}T00:00:00`);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtTime(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s.includes("T") ? s : `${s}T00:00:00`);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function fmtBytes(n?: number | null) {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function pct(n?: number) {
  return `${Math.round(n ?? 0)}%`;
}

export const MATERIAL_TYPES = [
  { value: "note", label: "Note" },
  { value: "book", label: "Book" },
  { value: "pdf", label: "PDF" },
  { value: "document", label: "Document" },
  { value: "video", label: "Video" },
  { value: "link", label: "Link" },
  { value: "assignment", label: "Assignment" },
];

export const ACTIVITY_TYPES = [
  { value: "mcq", label: "MCQ Quiz" },
  { value: "quiz", label: "Quiz" },
  { value: "reading", label: "Reading" },
  { value: "assignment", label: "Assignment" },
  { value: "practice", label: "Practice" },
  { value: "challenge", label: "Challenge" },
];
