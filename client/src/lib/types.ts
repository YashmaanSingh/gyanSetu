export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "student";
  status: string;
  avatarFileId?: string | null;
  phone?: string;
  designation?: string;
  bio?: string;
}

export interface Student {
  id: string;
  userId: string;
  studentCode: string;
  name: string;
  email: string;
  courseId?: string | null;
  courseName?: string | null;
  className?: string | null;
  batch?: string | null;
  status: string;
  guardianName?: string | null;
  enrollmentDate?: string | null;
  phone?: string;
  avatarFileId?: string | null;
  createdAt: string;
}

export interface Material {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  topic?: string | null;
  author?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  courseId?: string | null;
  courseName?: string | null;
  visibility: string;
  batch?: string | null;
  status: string;
  fileId?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  externalUrl?: string | null;
  thumbnailUrl?: string | null;
  viewCount?: number;
  completed?: boolean;
  createdAt: string;
}

export interface Activity {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  activityDate: string;
  startTime?: string | null;
  endTime?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  courseId?: string | null;
  batch?: string | null;
  courseName?: string | null;
  timeLimitMinutes?: number;
  passingScore?: number;
  maxAttempts?: number;
  status: string;
  isDaily?: boolean;
  totalMarks?: number;
  questionCount?: number;
  createdAt: string;
}

export interface Question {
  id: string;
  text: string;
  imageUrl?: string | null;
  options: { key: string; text: string }[];
  marks?: number;
  difficulty?: string;
  topic?: string | null;
  orderIndex?: number;
  selectedKey?: string | null;
  correctKey?: string;
  isCorrect?: boolean;
  explanation?: string | null;
  marksAwarded?: number;
}

export interface QuizAttempt {
  id: string;
  activityId: string;
  attemptNo: number;
  status: string;
  score?: number;
  totalMarks?: number;
  percentage?: number;
  correctCount?: number;
  wrongCount?: number;
  unansweredCount?: number;
  passed?: boolean;
  submittedAt?: string;
  startedAt?: string;
  deadlineAt?: string;
  timeTakenSeconds?: number;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: string;
  targetRole: string;
  publishDate: string;
  expiryDate?: string | null;
  authorName?: string | null;
  isRead?: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalMaterials: number;
  totalNotes: number;
  totalBooks: number;
  totalPublishedMaterials: number;
  todaysActivities: number;
  quizAttempts: number;
  avgScore: number;
  completionLast7: { date: string; total: number; completed: number }[];
  engagementLast6: any[];
  attemptsLast14: any[];
}

export interface PlatformSettings {
  platform?: { platformName: string; platformTagline: string; themeColor: string };
  quiz?: { defaultTimeLimit: number; defaultMaxAttempts: number; defaultPassingScore: number };
  notifications?: { notificationsEnabled: boolean };
  uploads?: { maxSizeMb: number; allowedExtensions: string };
}

// ===== Curriculum / Learning content =====
export interface ClassItem {
  id: string;
  name: string;
  slug: string;
  orderIndex: number;
  description?: string | null;
  status: string;
}

export interface SubjectRef {
  id: string;
  name: string;
  slug: string;
  classSubjectId: string;
  orderIndex: number;
}

export interface ChapterRef {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
  chapterNo: number;
  summary?: string | null;
  status: string;
  orderIndex: number;
}

export interface ChapterMaterial {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  fileId?: string | null;
  fileUrl?: string | null;
  downloadAllowed: boolean;
  status: string;
}

export interface ChapterContent {
  intro?: string | null;
  objectives?: string[];
  keyPoints?: string[];
  definitions?: { term: string; definition: string }[];
  examples?: { question: string; solution: string }[];
  practiceQuestions?: { q: string; a: string }[];
  revision?: string | null;
  body?: string | null;
}

export interface ChapterDetail extends ChapterRef {
  content: ChapterContent | null;
  studyMaterials: ChapterMaterial[];
}

export interface MyClassResponse {
  class: ClassItem | null;
  subjects: SubjectRef[];
}
