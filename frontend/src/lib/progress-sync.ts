/**
 * Offline-safe progress writes.
 *
 * Every change is described as an Op. An Op is applied to the on-screen state straight away
 * (optimistic update) and queued in an outbox saved in localStorage. The outbox is flushed to the
 * server when possible; if the phone is offline the ops simply wait and are sent later.
 * All server endpoints are idempotent, so a replayed op can never corrupt anything.
 */
import { EMPTY_STATE, isDayKey, type LectureProgress, type Plan, type ProgressState } from "./progress";

export type Op =
  | { type: "lecture"; id: string; body: { completed?: boolean; position?: number; duration?: number; day?: string } }
  | { type: "note"; id: string; content: string; day?: string }
  | { type: "plan-add"; plan: Plan }
  | { type: "plan-del"; id: string };

export interface Request {
  method: "PUT" | "POST" | "DELETE";
  url: string;
  body?: Record<string, unknown>;
}

const BASE = "/api/v1/progress";

export function opKey(op: Op): string {
  switch (op.type) {
    case "lecture":
      return `lec:${op.id}`;
    case "note":
      return `note:${op.id}`;
    default:
      return `plan:${op.type === "plan-add" ? op.plan.id : op.id}`;
  }
}

export function opToRequest(op: Op): Request {
  switch (op.type) {
    case "lecture":
      return { method: "PUT", url: `${BASE}/lectures/${encodeURIComponent(op.id)}`, body: op.body };
    case "note":
      return { method: "PUT", url: `${BASE}/notes/${encodeURIComponent(op.id)}`, body: { content: op.content, day: op.day } };
    case "plan-add":
      return {
        method: "POST",
        url: `${BASE}/plans`,
        body: {
          id: op.plan.id,
          date_key: op.plan.dateKey,
          title: op.plan.title,
          time: op.plan.time ?? null,
          source: op.plan.source ?? "manual",
        },
      };
    default:
      return { method: "DELETE", url: `${BASE}/plans/${encodeURIComponent(op.id)}` };
  }
}

/* ------------------------- optimistic reducer ------------------------- */

function withDay(days: string[], day?: string): string[] {
  if (!day || !isDayKey(day) || days.includes(day)) return days;
  return [...days, day].sort();
}

export function applyOp(state: ProgressState, op: Op, nowIso: string): ProgressState {
  switch (op.type) {
    case "lecture": {
      const prev: LectureProgress = state.lectures[op.id] ?? {
        lecture_id: op.id,
        completed: false,
        completed_at: null,
        position: 0,
        duration: 0,
        updated_at: nowIso,
      };
      const next: LectureProgress = { ...prev, updated_at: nowIso };
      if (op.body.completed !== undefined) {
        next.completed_at = op.body.completed ? (prev.completed ? prev.completed_at : nowIso) : null;
        next.completed = op.body.completed;
      }
      if (op.body.position !== undefined) next.position = Math.max(0, Math.floor(op.body.position));
      if (op.body.duration !== undefined) next.duration = Math.max(0, Math.floor(op.body.duration));
      return { ...state, lectures: { ...state.lectures, [op.id]: next }, days: withDay(state.days, op.body.day) };
    }
    case "note":
      return { ...state, notes: { ...state.notes, [op.id]: op.content }, days: withDay(state.days, op.day) };
    case "plan-add": {
      const others = state.plans.filter((p) => p.id !== op.plan.id);
      return { ...state, plans: [...others, op.plan].sort((a, b) => a.dateKey.localeCompare(b.dateKey)) };
    }
    default:
      return { ...state, plans: state.plans.filter((p) => p.id !== op.id) };
  }
}

/* ------------------------- server snapshot ------------------------- */

interface ServerSnapshot {
  lectures?: LectureProgress[];
  notes?: Record<string, { content: string }>;
  plans?: { id: string; date_key: string; title: string; time?: string | null; source?: string }[];
  activity_days?: string[];
}

export function fromServer(data: ServerSnapshot | null | undefined): ProgressState {
  if (!data) return EMPTY_STATE;
  const lectures: Record<string, LectureProgress> = {};
  for (const l of data.lectures ?? []) lectures[l.lecture_id] = l;
  const notes: Record<string, string> = {};
  for (const [id, n] of Object.entries(data.notes ?? {})) notes[id] = n.content;
  const plans: Plan[] = (data.plans ?? []).map((p) => ({
    id: p.id,
    dateKey: p.date_key,
    title: p.title,
    time: p.time ?? undefined,
    source: p.source === "auto" ? "auto" : "manual",
  }));
  return { lectures, notes, plans, days: (data.activity_days ?? []).filter(isDayKey) };
}

/** Server state with any still-unsent local changes laid back on top. */
export function overlayPending(server: ProgressState, pending: Op[], nowIso: string): ProgressState {
  return pending.reduce((acc, op) => applyOp(acc, op, nowIso), server);
}

/* ------------------------- legacy browser data ------------------------- */

export interface LegacyData {
  watched: string[];
  notes: Record<string, string>;
  plans: Plan[];
}

export function readLegacy(storage: Pick<Storage, "getItem">): LegacyData {
  const parse = <T,>(key: string, fallback: T): T => {
    try {
      const raw = storage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const watched = parse<unknown>("edutrack_watched_videos", []);
  const notes = parse<unknown>("edutrack_lecture_notes", {});
  const plans = parse<unknown>("edutrack_study_plans", []);
  return {
    watched: Array.isArray(watched) ? watched.filter((x): x is string => typeof x === "string") : [],
    notes:
      notes && typeof notes === "object" && !Array.isArray(notes)
        ? Object.fromEntries(Object.entries(notes as Record<string, unknown>).filter(([, v]) => typeof v === "string")) as Record<string, string>
        : {},
    plans: Array.isArray(plans)
      ? (plans as Plan[]).filter((p) => p && typeof p.id === "string" && isDayKey(p.dateKey) && typeof p.title === "string")
      : [],
  };
}

export const hasLegacy = (l: LegacyData) =>
  l.watched.length > 0 || Object.values(l.notes).some((n) => n.trim()) || l.plans.length > 0;

/* ------------------------- outbox ------------------------- */

type KV = Pick<Storage, "getItem" | "setItem">;
export type Sender = (req: Request) => Promise<void>;

/** HTTP status carried by an error, if any (axios puts it on error.response.status). */
function statusOf(err: unknown): number | undefined {
  const e = err as { response?: { status?: number }; status?: number };
  return e?.response?.status ?? e?.status;
}

export class Outbox {
  private ops: Op[];
  private flushing: Promise<void> | null = null;
  private again = false;

  constructor(
    private readonly storage: KV,
    private readonly storageKey: string,
    private readonly send: Sender,
  ) {
    this.ops = this.load();
  }

  private load(): Op[] {
    try {
      const raw = this.storage.getItem(this.storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as Op[]) : [];
    } catch {
      return [];
    }
  }

  private save() {
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.ops));
    } catch {
      // Storage full or blocked: ops stay in memory for this session.
    }
  }

  pending(): Op[] {
    return [...this.ops];
  }

  size(): number {
    return this.ops.length;
  }

  /** Queue an op. A newer op on the same thing replaces (or merges into) the older one. */
  enqueue(op: Op): void {
    const key = opKey(op);
    const i = this.ops.findIndex((o) => opKey(o) === key);
    if (i === -1) {
      this.ops.push(op);
    } else {
      const old = this.ops[i];
      if (old.type === "lecture" && op.type === "lecture") {
        this.ops[i] = { ...op, body: { ...old.body, ...op.body } };
      } else {
        this.ops[i] = op;
      }
    }
    this.save();
  }

  /**
   * Send everything queued, in order. Stops at the first network or server failure and keeps the
   * rest for next time. A rejected request (a 4xx that is not auth, rate-limit or missing-route) can never succeed, so it
   * is dropped instead of blocking the queue forever.
   */
  flush(): Promise<void> {
    if (this.flushing) {
      this.again = true;
      return this.flushing;
    }
    this.flushing = (async () => {
      do {
        this.again = false;
        while (this.ops.length > 0) {
          const op = this.ops[0];
          try {
            await this.send(opToRequest(op));
          } catch (err) {
            const status = statusOf(err);
            // 404/405 count as temporary: it just means the server has not been updated with these routes yet.
            const permanent = status !== undefined && status >= 400 && status < 500 && ![401, 404, 405, 408, 425, 429].includes(status);
            if (!permanent) return;
          }
          // A newer op may have replaced this one while it was in flight: only drop what we sent.
          if (this.ops[0] === op) this.ops.shift();
          else this.ops = this.ops.filter((o) => o !== op);
          this.save();
        }
      } while (this.again);
    })().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  clear(): void {
    this.ops = [];
    this.save();
  }
}
