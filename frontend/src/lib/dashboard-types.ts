import type { LectureLite } from "./progress";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  school?: string;
  grade_class?: string;
  batch_no?: string;
  role?: string;
  days_left?: number;
  is_approved?: boolean;
  subscription_status?: "active" | "expiring" | "expired" | "pending";
}

export interface VideoLecture extends LectureLite {
  youtube_url: string;
  video_url?: string;
}

export interface Material {
  id: string;
  title: string;
  chapter: string;
  subject: string;
  pdf_url?: string;
  file_url?: string;
}

export interface Notice {
  id: string;
  content: string;
  created_at: string;
}

export type Subject = "PHYSICS" | "CHEMISTRY";
export type View = "dashboard" | "lectures" | "materials" | "ai";

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
}
