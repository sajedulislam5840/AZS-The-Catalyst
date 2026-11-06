"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api";
import {
  dayKey,
  EMPTY_STATE,
  revisionPlans,
  type LectureLite,
  type Plan,
  type ProgressState,
} from "@/lib/progress";
import {
  applyOp,
  fromServer,
  hasLegacy,
  Outbox,
  overlayPending,
  readLegacy,
  type LegacyData,
  type Op,
  type Request,
} from "@/lib/progress-sync";

export type SyncStatus = "loading" | "synced" | "offline";

const cacheKey = (user: string) => `azs_progress_v2:${user}`;
const outboxKey = (user: string) => `azs_outbox_v2:${user}`;
const importedKey = (user: string) => `azs_imported_v1:${user}`;

async function send(req: Request): Promise<void> {
  await api.request({ method: req.method, url: req.url, data: req.body });
}

/** What the old, browser-only version of the dashboard had saved, shown while the server is unreachable. */
function stateFromLegacy(legacy: LegacyData): ProgressState {
  const now = new Date().toISOString();
  const lectures: ProgressState["lectures"] = {};
  for (const id of legacy.watched) {
    lectures[id] = { lecture_id: id, completed: true, completed_at: now, position: 0, duration: 0, updated_at: now };
  }
  return { lectures, notes: legacy.notes, plans: legacy.plans, days: [] };
}

function readCache(user: string): ProgressState | null {
  try {
    const raw = localStorage.getItem(cacheKey(user));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProgressState;
    if (parsed && typeof parsed === "object" && parsed.lectures && parsed.notes && Array.isArray(parsed.plans)) {
      return { ...EMPTY_STATE, ...parsed, days: Array.isArray(parsed.days) ? parsed.days : [] };
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * The student's saved progress: instant from the phone's own cache, kept in sync with the server,
 * and safe to use offline (changes wait in a queue and are sent when the connection returns).
 */
export function useProgress(userKey: string | null) {
  const [state, setState] = useState<ProgressState>(EMPTY_STATE);
  const [status, setStatus] = useState<SyncStatus>("loading");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(0);
  const [today, setToday] = useState(() => dayKey(new Date()));

  const stateRef = useRef(state);
  const outboxRef = useRef<Outbox | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const todayRef = useRef(today);
  const halted = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    todayRef.current = today;
  }, [today]);

  const flush = useCallback(async () => {
    const box = outboxRef.current;
    if (!box) return;
    await box.flush();
    setPending(box.size());
    // Anything still queued after a send attempt means the server could not be reached.
    setStatus((s) => (box.size() > 0 ? "offline" : s === "offline" ? "synced" : s));
  }, []);

  const scheduleFlush = useCallback(
    (delay = 800) => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => void flush(), delay);
    },
    [flush],
  );

  /** Send what is queued, then replace the screen with the server's truth (plus anything still unsent). */
  const sync = useCallback(async () => {
    const box = outboxRef.current;
    if (!userKey || !box) return;
    try {
      await box.flush();
      let res = await api.get("/api/v1/progress/me");
      if (localStorage.getItem(importedKey(userKey)) !== "1") {
        const legacy = readLegacy(localStorage);
        if (hasLegacy(legacy)) {
          res = await api.post("/api/v1/progress/import", { ...legacy, day: dayKey(new Date()) });
        }
        localStorage.setItem(importedKey(userKey), "1");
      }
      setState(overlayPending(fromServer(res.data), box.pending(), new Date().toISOString()));
      setPending(box.size());
      setStatus(box.size() === 0 ? "synced" : "offline");
    } catch {
      setPending(box.size());
      setStatus("offline");
    }
  }, [userKey]);

  const load = useCallback(async () => {
    if (!userKey) return;
    const box = new Outbox(localStorage, outboxKey(userKey), send);
    outboxRef.current = box;
    const legacy = readLegacy(localStorage);

    // Paint at once from the best thing we have on the device.
    const first = readCache(userKey) ?? (hasLegacy(legacy) ? stateFromLegacy(legacy) : EMPTY_STATE);
    setState(overlayPending(first, box.pending(), new Date().toISOString()));
    setPending(box.size());
    setReady(true);
    await sync();
  }, [userKey, sync]);

  useEffect(() => {
    // Loading from the device and the server on sign-in is exactly what an effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Keep the on-device cache current (debounced: a phone should not rewrite it on every tick).
  useEffect(() => {
    if (!userKey || !ready) return;
    const t = setTimeout(() => {
      if (halted.current) return;
      try {
        localStorage.setItem(cacheKey(userKey), JSON.stringify(state));
      } catch {
        // storage full or blocked: progress still lives on the server
      }
    }, 300);
    return () => clearTimeout(t);
  }, [state, userKey, ready]);

  // Send queued changes when the connection returns or the app is hidden; roll the day over at midnight.
  useEffect(() => {
    const onOnline = () => void sync();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void flush();
      else setToday(dayKey(new Date()));
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, [flush, sync]);

  const dispatch = useCallback(
    (op: Op) => {
      setState((s) => applyOp(s, op, new Date().toISOString()));
      outboxRef.current?.enqueue(op);
      setPending(outboxRef.current?.size() ?? 0);
      scheduleFlush();
    },
    [scheduleFlush],
  );

  const touchLecture = useCallback((id: string) => dispatch({ type: "lecture", id, body: {} }), [dispatch]);

  const savePosition = useCallback(
    (id: string, position: number, duration: number) => {
      const counts = position >= 30; // a few seconds of playback should not count as a study day
      dispatch({
        type: "lecture",
        id,
        body: { position: Math.floor(position), duration: Math.floor(duration), ...(counts ? { day: todayRef.current } : {}) },
      });
    },
    [dispatch],
  );

  /** Returns true when this call is what finished the lecture (so the UI can celebrate once). */
  const setCompleted = useCallback(
    (lecture: LectureLite, completed: boolean): boolean => {
      const was = Boolean(stateRef.current.lectures[lecture.id]?.completed);
      if (was === completed) return false;
      const day = todayRef.current;
      dispatch({ type: "lecture", id: lecture.id, body: completed ? { completed, day } : { completed } });
      if (completed) {
        for (const plan of revisionPlans(lecture, day)) {
          if (!stateRef.current.plans.some((p) => p.id === plan.id)) dispatch({ type: "plan-add", plan });
        }
      }
      return completed;
    },
    [dispatch],
  );

  const saveNote = useCallback(
    (id: string, content: string) => dispatch({ type: "note", id, content, day: content.trim() ? todayRef.current : undefined }),
    [dispatch],
  );

  const addPlan = useCallback(
    (dateKey: string, title: string, time?: string) => {
      const plan: Plan = {
        id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        dateKey,
        title: title.trim().slice(0, 200),
        time: time?.trim() || undefined,
        source: "manual",
      };
      dispatch({ type: "plan-add", plan });
    },
    [dispatch],
  );

  const removePlan = useCallback((id: string) => dispatch({ type: "plan-del", id }), [dispatch]);

  /** Stop writing anything to this device. Called while signing out, so a shared phone keeps nothing behind. */
  const halt = useCallback(() => {
    halted.current = true;
    if (flushTimer.current) clearTimeout(flushTimer.current);
  }, []);

  /** Best-effort send before signing out. */
  const flushNow = useCallback(async () => {
    await Promise.race([flush(), new Promise((r) => setTimeout(r, 1500))]);
  }, [flush]);

  return useMemo(
    () => ({
      state,
      status,
      ready,
      pending,
      today,
      touchLecture,
      savePosition,
      setCompleted,
      saveNote,
      addPlan,
      removePlan,
      refresh: sync,
      flushNow,
      halt,
    }),
    [state, status, ready, pending, today, touchLecture, savePosition, setCompleted, saveNote, addPlan, removePlan, sync, flushNow, halt],
  );
}
