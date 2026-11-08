export type SubStatus = "active" | "expiring" | "expired" | "pending";

export interface Student {
  id: string;
  full_name: string;
  email: string;
  school?: string | null;
  grade_class?: string | null;
  batch_no?: string | null;
  is_approved: boolean;
  subscription_end_date?: string | null;
  days_left: number;
  status: SubStatus;
  created_at?: string | null;
  completed_lectures: number;
  progress_percent: number;
  last_active?: string | null;
}

export interface Overview {
  totals: { students: number; paid_now: number; active: number; expiring: number; expired: number; pending: number };
  new_this_week: number;
  attention: { id: string; full_name: string; batch_no: string; status: SubStatus; days_left: number; reason: "expiring" | "recently_expired" | "new_unpaid" }[];
  batches: { batch: string; total: number; paid: number; expired: number; pending: number }[];
  lectures: { total: number; published: number; by_subject: Record<string, number> };
  materials: { total: number; published: number; by_subject: Record<string, number> };
  ai: { messages_7d: number; students_7d: number };
  collected_this_month: { payments: number; amount: number; amounts_recorded: number };
}

export interface ProgressChapter {
  chapter: string;
  total: number;
  completed: number;
  percent: number;
}
export interface ProgressSubject {
  subject: string;
  total: number;
  completed: number;
  percent: number;
  chapters: ProgressChapter[];
}
export interface ProgressSummary {
  total_lectures: number;
  completed_lectures: number;
  percent: number;
  streak: number;
  active_days_28: number;
  activity_last_28: string[];
  last_active: string | null;
  notes_count: number;
  plans_count: number;
  subjects: ProgressSubject[];
  recent: { lecture_id: string; title: string; subject: string; chapter: string; completed: boolean; watched_percent: number; updated_at: string | null }[];
}

export interface PaymentRow {
  id: string;
  days_added: number;
  amount: number | null;
  method: string;
  note: string | null;
  previous_end: string | null;
  new_end: string;
  recorded_by: string | null;
  created_at: string;
  voided: boolean;
  can_undo: boolean;
}

export interface StudentDetail {
  student: Student;
  payments: PaymentRow[];
  progress: ProgressSummary;
}

export interface Lecture {
  id: string;
  lecture_no: number;
  title: string;
  chapter: string;
  subject: string;
  video_url: string;
  is_published: boolean;
}

export interface MaterialRow {
  id: string;
  title: string;
  chapter: string;
  subject: string;
  file_url: string;
  is_published: boolean;
}

export interface NoticeRow {
  id: string;
  content: string;
  created_at: string;
}
