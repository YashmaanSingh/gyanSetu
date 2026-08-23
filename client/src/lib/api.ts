import type {
  ClassItem,
  SubjectRef,
  ChapterRef,
  ChapterDetail,
  MyClassResponse,
} from "./types";

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || "/api";

export interface ApiError extends Error {
  status: number;
  data?: any;
}

let accessToken: string | null = localStorage.getItem("gs_token");

export function getToken() {
  return accessToken;
}
export function setToken(t: string | null) {
  accessToken = t;
  if (t) localStorage.setItem("gs_token", t);
  else localStorage.removeItem("gs_token");
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  _attempt = 0
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const headers = new Headers(options.headers);
  const isForm = options.body instanceof FormData;
  if (!isForm) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(url, { ...options, headers, credentials: "include" });
  if (res.status === 401 && _attempt === 0 && accessToken) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiFetch<T>(path, options, 1);
  }
  if (!res.ok) {
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      /* noop */
    }
    const err = new Error(data?.error || `Request failed (${res.status})`) as ApiError;
    err.status = res.status;
    err.data = data;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : (res.text() as unknown as T);
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.accessToken) {
      setToken(data.accessToken);
      return true;
    }
  } catch {
    /* noop */
  }
  return false;
}

export const api = {
  get: <T = any>(p: string, q?: Record<string, any>) =>
    apiFetch<T>(withQuery(p, q)),
  post: <T = any>(p: string, body?: any) =>
    apiFetch<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(p: string, body?: any) =>
    apiFetch<T>(p, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(p: string, body?: any) =>
    apiFetch<T>(p, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T = any>(p: string) => apiFetch<T>(p, { method: "DELETE" }),
  upload: <T = any>(p: string, form: FormData) =>
    apiFetch<T>(p, { method: "POST", body: form }),
};

export const contentApi = {
  listClasses: () => api.get<{ classes: ClassItem[] }>("/content/classes"),
  listSubjects: () => api.get<{ subjects: { id: string; name: string; slug: string }[] }>("/content/subjects"),
  getClassSubjects: (classId: string) =>
    api.get<{ subjects: SubjectRef[] }>(`/content/classes/${classId}/subjects`),
  getSubjectChapters: (classId: string, subjectId: string) =>
    api.get<{ chapters: ChapterRef[] }>(
      `/content/classes/${classId}/subjects/${subjectId}/chapters`,
    ),
  getChapter: (chapterId: string) =>
    api.get<{ chapter: ChapterDetail }>(`/content/chapters/${chapterId}`),
  getMyClass: () => api.get<MyClassResponse>("/content/my-class"),
  search: (q: string, classId?: string, subjectId?: string) =>
    api.get<{ results: any[] }>("/content/search", { q, classId, subjectId }),
};

export const adminContentApi = {
  createClass: (body: any) => api.post("/content/classes", body),
  updateClass: (id: string, body: any) => api.put(`/content/classes/${id}`, body),
  archiveClass: (id: string) => api.del(`/content/classes/${id}`),
  createSubject: (body: any) => api.post("/content/subjects", body),
  updateSubject: (id: string, body: any) => api.put(`/content/subjects/${id}`, body),
  deleteSubject: (id: string) => api.del(`/content/subjects/${id}`),
  addClassSubject: (body: any) => api.post("/content/class-subjects", body),
  removeClassSubject: (id: string) => api.del(`/content/class-subjects/${id}`),
  createChapter: (body: any) => api.post("/content/chapters", body),
  updateChapter: (id: string, body: any) => api.put(`/content/chapters/${id}`, body),
  deleteChapter: (id: string) => api.del(`/content/chapters/${id}`),
  upsertChapterContent: (id: string, body: any) => api.put(`/content/chapters/${id}/content`, body),
  createMaterial: (id: string, form: FormData) =>
    api.upload(`/content/chapters/${id}/materials`, form),
  updateMaterial: (materialId: string, body: any) =>
    api.put(`/content/materials/${materialId}`, body),
  deleteMaterial: (materialId: string) => api.del(`/content/materials/${materialId}`),
};

function withQuery(path: string, q?: Record<string, any>) {
  if (!q) return path;
  const sp = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `${path}?${s}` : path;
}

export function fileUrl(id: string) {
  return `${API_URL}/files/${id}`;
}

function apiOrigin(): string {
  if (!API_URL.startsWith("http")) return "";
  try {
    return new URL(API_URL).origin;
  } catch {
    return "";
  }
}

const API_ORIGIN = apiOrigin();

// Resolves a server-provided relative URL (e.g. /api/files/123) against the API
// origin so it works when the frontend is served from a different domain (prod).
export function resolveFileUrl(u?: string | null): string {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  return API_ORIGIN ? `${API_ORIGIN}${u}` : u;
}
