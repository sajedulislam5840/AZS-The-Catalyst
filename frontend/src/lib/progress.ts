/**
 * Pure student-progress logic. No React, no network, no clock access:
 * everything takes "today" as an argument so it is deterministic and unit-testable.
 */

export interface LectureLite {
  id: string;
  chapter: string;
  subject: string;
  lecture_no: number;
  topic?: string;
  title?: string;
}

export interface LectureProgress {
  lecture_id: string;
  completed: boolean;
  completed_at: string | null;
  position: number;
  duration: number;
  updated_at: string;
}

export interface Plan {
  id: string;
  dateKey: string;
  title: string;
  time?: string;
  source?: "manual" | "auto";
}

export interface ProgressState {
  lectures: Record<string, LectureProgress>;
  notes: Record<string, string>;
  plans: Plan[];
  days: string[];
}

export const EMPTY_STATE: ProgressState = { lectures: {}, notes: {}, plans: [], days: [] };

/* ------------------------------ dates ------------------------------ */

const pad = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD in the student's own timezone. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toUtcMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Calendar-day arithmetic that ignores daylight-saving shifts. */
export function addDays(key: string, n: number): string {
  const d = new Date(toUtcMs(key) + n * 86_400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function dayDiff(later: string, earlier: string): number {
  return Math.round((toUtcMs(later) - toUtcMs(earlier)) / 86_400_000);
}

export function isDayKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/* ------------------------------ streaks ------------------------------ */

export interface Streak {
  current: number;
  best: number;
  activeToday: boolean;
}

/**
 * The current streak stays alive until the end of the day after the last active day,
 * so a student who has not studied yet today still sees yesterday's streak.
 */
export function computeStreak(days: string[], today: string): Streak {
  const set = new Set(days.filter(isDayKey));
  const activeToday = set.has(today);

  let current = 0;
  let cursor = activeToday ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...set].sort();
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    run = i > 0 && dayDiff(sorted[i], sorted[i - 1]) === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return { current, best, activeToday };
}

export interface WeekDot {
  day: string;
  active: boolean;
  isToday: boolean;
}

/** The last seven days, oldest first, ending today. */
export function weekDots(days: string[], today: string): WeekDot[] {
  const set = new Set(days);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    return { day, active: set.has(day), isToday: day === today };
  });
}

/* ------------------------------ xp & level ------------------------------ */

export const XP_PER_LECTURE = 20;
export const XP_PER_NOTE = 5;
export const XP_PER_ACTIVE_DAY = 3;

export function computeXp(completed: number, notes: number, activeDays: number): number {
  return completed * XP_PER_LECTURE + notes * XP_PER_NOTE + activeDays * XP_PER_ACTIVE_DAY;
}

export interface LevelInfo {
  level: number;
  xp: number;
  intoLevel: number;
  toNext: number;
  pct: number;
}

/** Level L starts at 50 * (L - 1)^2 XP: 0, 50, 200, 450, 800 ... */
export function levelInfo(xp: number): LevelInfo {
  const safe = Math.max(0, Math.floor(xp));
  const level = Math.floor(Math.sqrt(safe / 50)) + 1;
  const start = 50 * (level - 1) ** 2;
  const next = 50 * level ** 2;
  const span = next - start;
  const intoLevel = safe - start;
  return { level, xp: safe, intoLevel, toNext: next - safe, pct: span > 0 ? Math.min(100, Math.round((intoLevel / span) * 100)) : 0 };
}

/* ------------------------------ stats ------------------------------ */

export interface ChapterStat {
  chapter: string;
  subject: string;
  total: number;
  done: number;
  pct: number;
}

export function chapterStats(lectures: LectureLite[], state: ProgressState): ChapterStat[] {
  const map = new Map<string, ChapterStat>();
  for (const l of lectures) {
    const chapter = (l.chapter || "General Chapter").trim();
    const key = `${(l.subject || "PHYSICS").toUpperCase()}::${chapter}`;
    let stat = map.get(key);
    if (!stat) {
      stat = { chapter, subject: (l.subject || "PHYSICS").toUpperCase(), total: 0, done: 0, pct: 0 };
      map.set(key, stat);
    }
    stat.total += 1;
    if (state.lectures[l.id]?.completed) stat.done += 1;
  }
  return [...map.values()].map((s) => ({ ...s, pct: s.total ? Math.round((s.done / s.total) * 100) : 0 }));
}

export function countCompleted(lectures: LectureLite[], state: ProgressState): number {
  let n = 0;
  for (const l of lectures) if (state.lectures[l.id]?.completed) n += 1;
  return n;
}

export function countNotes(state: ProgressState): number {
  return Object.values(state.notes).filter((t) => t.trim().length > 0).length;
}

/** Lectures completed in the seven days ending today (by the student's local calendar). */
export function completedThisWeek(state: ProgressState, today: string): number {
  const from = addDays(today, -6);
  let n = 0;
  for (const p of Object.values(state.lectures)) {
    if (!p.completed || !p.completed_at) continue;
    const t = new Date(p.completed_at);
    if (Number.isNaN(t.getTime())) continue;
    const k = dayKey(t);
    if (k >= from && k <= today) n += 1;
  }
  return n;
}

/* ------------------------------ resume ------------------------------ */

export type ResumeKind = "resume" | "next" | "start" | "done";

export interface Resume {
  kind: ResumeKind;
  lecture: LectureLite | null;
  position: number;
}

/**
 * What should the student watch next?
 *  1. a lecture they started but did not finish (most recently touched first)
 *  2. the next unfinished lecture in the chapter they most recently completed
 *  3. the first unfinished lecture
 */
export function findResume(lectures: LectureLite[], state: ProgressState): Resume {
  if (lectures.length === 0) return { kind: "done", lecture: null, position: 0 };

  const touched = lectures
    .map((l) => ({ l, p: state.lectures[l.id] }))
    .filter(({ p }) => p && !p.completed && (p.position > 0 || p.updated_at))
    .sort((a, b) => b.p!.updated_at.localeCompare(a.p!.updated_at));
  if (touched.length > 0) {
    const top = touched[0];
    return { kind: "resume", lecture: top.l, position: top.p!.position };
  }

  const lastDone = lectures
    .filter((l) => state.lectures[l.id]?.completed)
    .sort((a, b) => (state.lectures[b.id].completed_at || "").localeCompare(state.lectures[a.id].completed_at || ""))[0];
  if (lastDone) {
    const sameChapter = lectures.find(
      (l) => l.chapter === lastDone.chapter && l.subject === lastDone.subject && !state.lectures[l.id]?.completed,
    );
    if (sameChapter) return { kind: "next", lecture: sameChapter, position: 0 };
  }

  const first = lectures.find((l) => !state.lectures[l.id]?.completed);
  if (first) return { kind: lastDone ? "next" : "start", lecture: first, position: 0 };
  return { kind: "done", lecture: null, position: 0 };
}

/* ------------------------------ badges ------------------------------ */

export interface Badge {
  id: string;
  title: string;
  hint: string;
  earned: boolean;
  /** 0 to 1 */
  progress: number;
}

export interface BadgeInput {
  completed: number;
  total: number;
  bestStreak: number;
  notes: number;
  chaptersDone: number;
  subjectsDone: number;
}

const ratio = (value: number, goal: number) => Math.max(0, Math.min(1, goal > 0 ? value / goal : 0));

export function computeBadges(i: BadgeInput): Badge[] {
  const half = i.total > 0 ? i.completed / i.total : 0;
  return [
    { id: "first-spark", title: "First Spark", hint: "Finish your first lecture", earned: i.completed >= 1, progress: ratio(i.completed, 1) },
    { id: "on-a-roll", title: "On a Roll", hint: "Study 3 days in a row", earned: i.bestStreak >= 3, progress: ratio(i.bestStreak, 3) },
    { id: "week-warrior", title: "Week Warrior", hint: "Study 7 days in a row", earned: i.bestStreak >= 7, progress: ratio(i.bestStreak, 7) },
    { id: "note-taker", title: "Note Taker", hint: "Write notes on 5 lectures", earned: i.notes >= 5, progress: ratio(i.notes, 5) },
    { id: "chapter-master", title: "Chapter Master", hint: "Complete every lecture in a chapter", earned: i.chaptersDone >= 1, progress: ratio(i.chaptersDone, 1) },
    { id: "both-worlds", title: "Both Worlds", hint: "Finish a chapter in Physics and in Chemistry", earned: i.subjectsDone >= 2, progress: ratio(i.subjectsDone, 2) },
    { id: "halfway", title: "Halfway There", hint: "Complete half of all lectures", earned: i.total > 0 && half >= 0.5, progress: ratio(half, 0.5) },
  ];
}

export function badgeInputFor(lectures: LectureLite[], state: ProgressState, bestStreak: number): BadgeInput {
  const stats = chapterStats(lectures, state);
  const doneChapters = stats.filter((s) => s.total > 0 && s.done === s.total);
  return {
    completed: countCompleted(lectures, state),
    total: lectures.length,
    bestStreak,
    notes: countNotes(state),
    chaptersDone: doneChapters.length,
    subjectsDone: new Set(doneChapters.map((s) => s.subject)).size,
  };
}

/* ------------------------------ spaced revision ------------------------------ */

export const REVISION_OFFSETS = [1, 3, 7] as const;

/**
 * Revision reminders after a lecture is finished: the next day, then 3 and 7 days later.
 * Ids are derived from the lecture, so creating them twice is harmless.
 */
export function revisionPlans(lecture: LectureLite, doneDay: string): Plan[] {
  const name = (lecture.topic || lecture.title || `Lecture ${lecture.lecture_no}`).trim();
  return REVISION_OFFSETS.map((offset) => ({
    id: `rev-${lecture.id}-${offset}`,
    dateKey: addDays(doneDay, offset),
    title: `Revise: ${name}`.slice(0, 200),
    source: "auto" as const,
  }));
}

/* ------------------------------ greeting ------------------------------ */

export function greeting(hour: number): string {
  if (hour < 5) return "Late-night session";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/* ------------------------------ time ------------------------------ */

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
