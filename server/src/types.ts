export type Role = "admin" | "student";
export type UserStatus = "active" | "inactive";
export type MaterialType =
  | "note"
  | "book"
  | "pdf"
  | "document"
  | "video"
  | "link"
  | "assignment";
export type Visibility = "all" | "course" | "batch";
export type MaterialStatus = "draft" | "published" | "archived";
export type ActivityType =
  | "mcq"
  | "quiz"
  | "reading"
  | "assignment"
  | "practice"
  | "challenge";
export type Difficulty = "easy" | "medium" | "hard";
export type AttemptStatus = "in_progress" | "submitted" | "expired";
export type Priority = "normal" | "important" | "critical";
export type FileKind = "pdf" | "image" | "doc" | "video" | "audio" | "other";

export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  email: string;
  status: UserStatus;
}

export interface QuestionOption {
  key: string;
  text: string;
}

export interface QuizQuestionPublic {
  id: string;
  text: string;
  imageFileId: string | null;
  options: QuestionOption[];
  marks: number;
  difficulty: Difficulty;
  topic: string | null;
  orderIndex: number;
}

export interface AttemptAnswerInput {
  questionId: string;
  selectedKey: string | null;
}
