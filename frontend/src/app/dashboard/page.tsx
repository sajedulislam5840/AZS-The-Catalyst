"use client";

import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Atom, Bot, ExternalLink, FlaskConical, Loader2, Lock, Megaphone, MessageCircle, RefreshCw, SearchX, ShieldAlert, Sparkles } from "lucide-react";
import EduTrackAiChat from "@/components/EduTrackAiChat";
import SiteFooter from "@/components/SiteFooter";
import GlowIcon from "@/components/ui/GlowIcon";
import { SIMS, SimModal } from "@/components/landing/SimulationsSection";
import BadgesGrid from "@/components/dashboard/BadgesGrid";
import Celebration, { type CelebrationEvent } from "@/components/dashboard/Celebration";
import ChapterCard from "@/components/dashboard/ChapterCard";
import { MobileDock, Sidebar, TopBar } from "@/components/dashboard/Chrome";
import LockedScreen from "@/components/dashboard/LockedScreen";
import NotificationBanner from "@/components/dashboard/NotificationBanner";
import ContinueCard from "@/components/dashboard/ContinueCard";
import CountUp from "@/components/dashboard/CountUp";
import DashBackdrop from "@/components/dashboard/DashBackdrop";
import LectureCard from "@/components/dashboard/LectureCard";
import MaterialCard from "@/components/dashboard/MaterialCard";
import NoticeSheet from "@/components/dashboard/NoticeSheet";
import PracticeLab, { ChapterSimBanner } from "@/components/dashboard/PracticeLab";
import ProgressRing from "@/components/dashboard/ProgressRing";
import Sheet from "@/components/dashboard/Sheet";
import { DashboardSkeleton, GridSkeleton } from "@/components/dashboard/Skeleton";
import StreakCard from "@/components/dashboard/StreakCard";
import { DayPlanSheet, DueToday, StudyCalendar } from "@/components/dashboard/StudyCalendar";
import WeeklyGoal from "@/components/dashboard/WeeklyGoal";
import { CONTENT_KEY, useDashboardData } from "@/hooks/useDashboardData";
import { useNotifications } from "@/hooks/useNotifications";
import { useProgress } from "@/hooks/useProgress";
import { simForChapter, type SimId } from "@/lib/chapter-sims";
import type { Material, Subject, UserProfile, VideoLecture, View } from "@/lib/dashboard-types";
import { getDrivePreviewUrl } from "@/lib/media";
import {
  badgeInputFor,
  chapterStats,
  completedThisWeek,
  computeBadges,
  computeStreak,
  computeXp,
  countCompleted,
  countNotes,
  findResume,
  greeting,
  levelInfo,
  weekDots,
  type Plan,
} from "@/lib/progress";
import { TEACHER } from "@/lib/social";

const ADMIN_EMAIL = "rabbi@edutrack.com";
const VIEWS: View[] = ["dashboard", "lectures", "materials", "ai"];
const GOAL_KEY = "azs_weekly_goal";
const SEEN_KEY = "azs_notice_seen";

/* ------------------------- small helpers ------------------------- */

const noopSubscribe = () => () => {};

function readSession() {
  const token = localStorage.getItem("token") || localStorage.getItem("access_token");
  if (!token) return null;
  const role = (localStorage.getItem("user_role") || "").toUpperCase();
  const email = (localStorage.getItem("user_email") || "").toLowerCase();
  return {
    role,
    email,
    isAdmin: role === "ADMIN" || email === ADMIN_EMAIL,
    name: localStorage.getItem("user_name") || localStorage.getItem("student_name") || "Student",
    batch: localStorage.getItem("batch_no") || "General Batch",
  };
}

function readGoal(): number {
  try {
    const n = Number(localStorage.getItem(GOAL_KEY));
    return Number.isInteger(n) && n >= 1 && n <= 14 ? n : 5;
  } catch {
    return 5;
  }
}

function buildUrl(view: View, subject: Subject, chapter?: string | null, lecture?: string | null): string {
  if (view === "dashboard") return window.location.pathname;
  const q = new URLSearchParams({ view });
  if (view === "lectures") {
    q.set("subject", subject);
    if (chapter) q.set("chapter", chapter);
    if (lecture) q.set("lecture", lecture);
  }
  return `${window.location.pathname}?${q.toString()}`;
}

const subjectKey = (s: string): Subject => (s.toUpperCase() === "CHEMISTRY" ? "CHEMISTRY" : "PHYSICS");

/* ------------------------- page ------------------------- */

function DashboardContent() {
  const router = useRouter();
  const params = useSearchParams();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const session = useMemo(() => (mounted ? readSession() : null), [mounted]);

  // ---- where the student is (kept in the address bar so the Back button just works)
  const rawView = params.get("view");
  const view: View = VIEWS.includes(rawView as View) ? (rawView as View) : "dashboard";
  const subject: Subject = params.get("subject") === "CHEMISTRY" ? "CHEMISTRY" : "PHYSICS";
  const chapter = params.get("chapter");
  const focusLecture = params.get("lecture");

  const navigate = useCallback(
    (next: { view: View; subject?: Subject; chapter?: string | null; lecture?: string | null }, replace = false) => {
      const url = buildUrl(next.view, next.subject ?? "PHYSICS", next.chapter, next.lecture);
      if (replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
      window.scrollTo({ top: 0 });
    },
    [],
  );

  // ---- sign-in checks
  useEffect(() => {
    if (!mounted) return;
    if (!session) router.replace("/login");
    else if (session.isAdmin) router.replace("/admin");
  }, [mounted, session, router]);
  const active = Boolean(session && !session.isAdmin);

  // ---- data
  const [serverProfile, setServerProfile] = useState<Partial<UserProfile>>({});
  const onProfile = useCallback(
    (d: Partial<UserProfile> & { is_admin?: boolean }) => {
      if (d.is_admin || String(d.role).toUpperCase() === "ADMIN" || d.email === ADMIN_EMAIL) {
        router.replace("/admin");
        return;
      }
      setServerProfile({ full_name: d.full_name, email: d.email, batch_no: d.batch_no, grade_class: d.grade_class, school: d.school, days_left: d.days_left, is_approved: d.is_approved, subscription_status: d.subscription_status });
      if (d.full_name) localStorage.setItem("user_name", d.full_name);
      if (d.batch_no) localStorage.setItem("batch_no", d.batch_no);
    },
    [router],
  );
  const onUnauthorized = useCallback(() => {
    localStorage.clear();
    router.replace("/login");
  }, [router]);

  const { videos, materials, notice, loading, error, reload } = useDashboardData({ enabled: active, onProfile, onUnauthorized });
  const progress = useProgress(active ? session!.email || "student" : null);
  const { state, today, ready, setCompleted, savePosition, touchLecture, saveNote, addPlan, removePlan } = progress;

  const fullName = serverProfile.full_name || session?.name || "Student";
  const batch = serverProfile.batch_no || session?.batch || "General Batch";
  const daysLeft = serverProfile.days_left !== undefined ? serverProfile.days_left : 30;
  const subStatus = serverProfile.subscription_status;
  // The server decides; the day count is only a fallback for an older API that does not send the status.
  const isExpired = subStatus ? subStatus === "expired" || subStatus === "pending" : daysLeft <= 0 || serverProfile.is_approved === false;
  const isExpiringSoon = !isExpired && daysLeft > 0 && daysLeft <= 7;
  const { items: notifications, markAllRead } = useNotifications(active && !isExpired);
  const [rechecking, setRechecking] = useState(false);

  // A locked student must not keep seeing lectures that were saved on this phone while they were paying.
  useEffect(() => {
    if (!isExpired) return;
    try {
      localStorage.removeItem(CONTENT_KEY);
    } catch {
      // ignore
    }
  }, [isExpired]);

  // ---- numbers shown on screen
  const streak = useMemo(() => computeStreak(state.days, today), [state.days, today]);
  const dots = useMemo(() => weekDots(state.days, today), [state.days, today]);
  const stats = useMemo(() => chapterStats(videos, state), [videos, state]);
  const completedCount = useMemo(() => countCompleted(videos, state), [videos, state]);
  const notesCount = countNotes(state);
  const level = useMemo(() => levelInfo(computeXp(completedCount, notesCount, state.days.length)), [completedCount, notesCount, state.days.length]);
  const badges = useMemo(() => computeBadges(badgeInputFor(videos, state, streak.best)), [videos, state, streak.best]);
  const resume = useMemo(() => findResume(videos, state), [videos, state]);
  const weeklyDone = useMemo(() => completedThisWeek(state, today), [state, today]);
  const coverage = videos.length ? Math.round((completedCount / videos.length) * 100) : 0;

  const bySubject = useMemo(() => {
    const out: Record<Subject, { total: number; done: number }> = { PHYSICS: { total: 0, done: 0 }, CHEMISTRY: { total: 0, done: 0 } };
    for (const v of videos) {
      const s = subjectKey(v.subject || "PHYSICS");
      out[s].total += 1;
      if (state.lectures[v.id]?.completed) out[s].done += 1;
    }
    return out;
  }, [videos, state.lectures]);

  const chaptersOfSubject = useMemo(() => stats.filter((s) => s.subject === subject), [stats, subject]);
  const lecturesOfChapter = useMemo(() => (chapter ? videos.filter((v) => (v.chapter || "General Chapter").trim() === chapter && subjectKey(v.subject) === subject) : []), [videos, chapter, subject]);
  const materialsByChapter = useMemo(() => {
    const map: Record<string, Material[]> = {};
    for (const m of materials) (map[(m.chapter || "General Chapter").trim()] ??= []).push(m);
    return map;
  }, [materials]);
  const upNext = useMemo(() => videos.filter((v) => !state.lectures[v.id]?.completed && v.id !== resume.lecture?.id).slice(0, 3), [videos, state.lectures, resume.lecture]);

  // ---- search
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query).trim().toLowerCase();
  const searching = deferredQuery.length > 0;
  const foundVideos = useMemo(
    () => (searching ? videos.filter((v) => `${v.topic || v.title || ""} ${v.chapter || ""} ${v.subject || ""}`.toLowerCase().includes(deferredQuery)) : []),
    [videos, deferredQuery, searching],
  );
  const foundMaterials = useMemo(
    () => (searching ? materials.filter((m) => `${m.title || ""} ${m.chapter || ""} ${m.subject || ""}`.toLowerCase().includes(deferredQuery)) : []),
    [materials, deferredQuery, searching],
  );

  // ---- overlays and small UI state
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [seenNotice, setSeenNotice] = useState<string | null>(() => {
    try {
      return typeof window === "undefined" ? null : localStorage.getItem(SEEN_KEY);
    } catch {
      return null;
    }
  });
  const [pdf, setPdf] = useState<{ url: string; raw: string; title: string } | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [planDay, setPlanDay] = useState<string | null>(null);
  const [simId, setSimId] = useState<SimId | null>(null);
  const [chat, setChat] = useState<{ open: boolean; prompt?: string }>({ open: false });
  const [goal, setGoalState] = useState(readGoal);
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);
  const [materialFilter, setMaterialFilter] = useState<"ALL" | Subject>("ALL");

  const setGoal = (n: number) => {
    setGoalState(n);
    try {
      localStorage.setItem(GOAL_KEY, String(n));
    } catch {
      // not saved: fine
    }
  };

  const hasUnread = Boolean(notice && notice.id !== seenNotice);
  const openNotice = () => {
    if (!notice) return;
    setNoticeOpen(true);
    setSeenNotice(notice.id);
    try {
      localStorage.setItem(SEEN_KEY, notice.id);
    } catch {
      // not saved: fine
    }
  };

  // ---- celebrations: only for things the student just did, never for progress that arrived from a sync
  const armed = useRef(false);
  const baseline = useRef<{ badges: Set<string>; level: number; done: Set<string> } | null>(null);
  const eventId = useRef(0);
  useEffect(() => {
    if (!ready || loading) return;
    const next = {
      badges: new Set(badges.filter((b) => b.earned).map((b) => b.id)),
      level: level.level,
      done: new Set(stats.filter((s) => s.total > 0 && s.done === s.total).map((s) => `${s.subject}::${s.chapter}`)),
    };
    const prev = baseline.current;
    baseline.current = next;
    if (!prev || !armed.current) return;
    armed.current = false;

    const newChapter = stats.find((s) => s.total > 0 && s.done === s.total && !prev.done.has(`${s.subject}::${s.chapter}`));
    const newBadge = badges.find((b) => b.earned && !prev.badges.has(b.id));
    eventId.current += 1;
    const id = eventId.current;
    // The celebration is a reaction to the student's own tap, so showing it from here is intended.
    if (newChapter) setCelebration({ id, kind: "chapter", title: "Chapter complete!", text: `You finished every lecture in ${newChapter.chapter}.` });
    else if (newBadge) setCelebration({ id, kind: "badge", title: `Badge earned: ${newBadge.title}`, text: newBadge.hint });
    else if (next.level > prev.level) setCelebration({ id, kind: "level", title: `Level ${next.level}!`, text: "Your hard work is paying off." });
    else setCelebration({ id, kind: "lecture", title: "Lecture complete", text: "+20 XP. Revision reminders added to your planner." });
  }, [badges, level.level, stats, ready, loading]);

  // ---- actions
  const complete = useCallback(
    (lecture: VideoLecture, done: boolean) => {
      if (setCompleted(lecture, done)) armed.current = true;
    },
    [setCompleted],
  );
  const openLecture = useCallback(
    (lecture: VideoLecture) => {
      setQuery("");
      navigate({ view: "lectures", subject: subjectKey(lecture.subject), chapter: (lecture.chapter || "General Chapter").trim(), lecture: lecture.id });
    },
    [navigate],
  );
  const askAi = useCallback((prompt: string) => setChat({ open: true, prompt }), []);
  const openPlan = useCallback(
    (plan: Plan) => {
      const m = /^rev-(.+)-\d+$/.exec(plan.id);
      const lecture = m ? videos.find((v) => v.id === m[1]) : undefined;
      if (lecture) {
        setPlanDay(null);
        openLecture(lecture);
      }
    },
    [videos, openLecture],
  );
  const go = (v: View) => {
    setMenuOpen(false);
    setQuery("");
    navigate({ view: v, subject });
  };
  const logout = async () => {
    await progress.flushNow();
    progress.halt();
    localStorage.clear();
    router.replace("/login");
  };

  if (!mounted || !active) return null;

  if (isExpired) {
    return (
      <LockedScreen
        name={fullName}
        status={subStatus === "expired" ? "expired" : "pending"}
        checking={rechecking}
        onRecheck={() => {
          setRechecking(true);
          void reload().finally(() => setRechecking(false));
        }}
        onLogout={logout}
      />
    );
  }

  const first = fullName.trim().split(/\s+/)[0] || "there";
  const chapterSim = chapter ? simForChapter(chapter, subject) : null;
  const showSkeleton = loading && videos.length === 0;
  const simOpen = SIMS.find((s) => s.id === simId) ?? null;
  const toGo = Math.max(0, goal - weeklyDone);

  const renderLectureCards = (list: VideoLecture[]) => (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((v) => (
        <LectureCard
          key={v.id}
          lecture={v}
          progress={state.lectures[v.id]}
          note={state.notes[v.id] ?? ""}
          autoPlay={focusLecture === v.id}
          highlight={focusLecture === v.id}
          onOpen={(l) => touchLecture(l.id)}
          onSavePosition={savePosition}
          onSetCompleted={complete}
          onSaveNote={saveNote}
          onAskAi={askAi}
        />
      ))}
    </div>
  );

  const heading = (text: string, sub?: string) => (
    <div>
      <h1 className="text-2xl font-black tracking-tight text-[#075985] sm:text-3xl">{text}</h1>
      {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
    </div>
  );

  return (
    <div className="relative flex min-h-screen bg-[#F3F8FC] font-sans text-slate-900 antialiased selection:bg-sky-100">
      <DashBackdrop />

      <Sidebar
        view={view}
        open={menuOpen}
        name={fullName}
        batch={batch}
        level={level}
        counts={{ lectures: videos.length, materials: materials.length }}
        onNavigate={go}
        onClose={() => setMenuOpen(false)}
        onLogout={logout}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TopBar
          query={query}
          streakDays={streak.current}
          level={level.level}
          hasUnread={hasUnread}
          hasNotice={Boolean(notice)}
          status={progress.status}
          pending={progress.pending}
          onQuery={setQuery}
          onMenu={() => setMenuOpen(true)}
          onBell={openNotice}
        />

        <NotificationBanner items={notifications} onDismiss={() => void markAllRead()} renewHref={TEACHER.whatsapp} />

        {/* One slim reminder once the message above has been dismissed (or was never created). */}
        {isExpiringSoon && !notifications.some((n) => !n.read) && (
          <a href={TEACHER.whatsapp} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900 active:bg-amber-100">
            <ShieldAlert className="h-4 w-4 shrink-0 text-[#CC310E]" />
            <span>Subscription ends in {daysLeft} {daysLeft === 1 ? "day" : "days"}</span>
            <span className="text-[#CC310E] underline underline-offset-2">Renew on WhatsApp</span>
          </a>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 pb-28 sm:space-y-8 sm:p-8 md:pb-12">
          {isExpired && (
            <div className="dash-card space-y-6 p-8 text-center sm:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600">
                <Lock className="h-8 w-8" />
              </div>
              <div className="mx-auto max-w-lg space-y-2">
                <h2 className="text-2xl font-black text-[#075985]">Access Restricted</h2>
                <p className="text-sm leading-relaxed text-slate-600">Your student subscription has expired. Video streaming and PDF study handouts are currently locked.</p>
              </div>
              <a href={TEACHER.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#CC310E] px-6 text-xs font-bold text-white shadow-md hover:bg-[#A8270B]">
                <MessageCircle className="h-4 w-4" /> Contact Academic Guide on WhatsApp
              </a>
            </div>
          )}

          {!isExpired && error && (
            <div role="alert" className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
              <p className="text-sm font-semibold text-amber-900">{error}</p>
              <button type="button" onClick={() => void reload()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-xs font-extrabold text-amber-900 shadow-sm active:scale-95">
                <RefreshCw className="h-4 w-4" /> Try again
              </button>
            </div>
          )}

          {/* ---------------- SEARCH ---------------- */}
          {!isExpired && searching && (
            <section className="space-y-6" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-[#075985]">Results for &ldquo;{query.trim()}&rdquo;</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {foundVideos.length} lectures and {foundMaterials.length} study sheets
                  </p>
                </div>
                <button type="button" onClick={() => setQuery("")} className="h-11 rounded-xl border border-[#D3E3EF] bg-white px-4 text-xs font-bold text-slate-700">
                  Clear search
                </button>
              </div>
              {foundVideos.length + foundMaterials.length === 0 ? (
                <div className="dash-card space-y-3 p-12 text-center">
                  <SearchX className="mx-auto h-12 w-12 text-slate-400" />
                  <p className="text-sm font-bold text-slate-700">No matching lecture or sheet found.</p>
                </div>
              ) : (
                <>
                  {foundVideos.length > 0 && renderLectureCards(foundVideos)}
                  {foundMaterials.length > 0 && (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {foundMaterials.map((m) => (
                        <MaterialCard key={m.id} material={m} onPreview={(mat) => { setPdfLoading(true); setPdf({ url: getDrivePreviewUrl(mat.pdf_url || mat.file_url || ""), raw: mat.pdf_url || mat.file_url || "", title: mat.title }); }} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* ---------------- HOME ---------------- */}
          {!isExpired && !searching && view === "dashboard" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-5 sm:space-y-8">
              {heading(`${greeting(new Date().getHours())}, ${first}`, weeklyDone >= goal ? "You hit your weekly goal. Everything from here is a bonus." : `${toGo} more lecture${toGo === 1 ? "" : "s"} to reach your weekly goal.`)}

              {showSkeleton ? (
                <DashboardSkeleton />
              ) : (
                <>
                  {hasUnread && notice && (
                    <button type="button" onClick={openNotice} className="flex w-full items-center gap-3 rounded-2xl border border-[#FAC3B0] bg-gradient-to-r from-[#FEF3EF] to-white p-4 text-left active:scale-[0.99]">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#CC310E] text-white">
                        <Megaphone className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-[#CC310E]">New notice</span>
                        <span className="block truncate text-sm font-bold text-slate-800">{notice.content}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#CC310E]" />
                    </button>
                  )}

                  <ContinueCard resume={resume} duration={resume.lecture ? state.lectures[resume.lecture.id]?.duration ?? 0 : 0} loading={loading} hasLectures={videos.length > 0} onOpen={openLecture} onLab={() => document.getElementById("practice-lab")?.scrollIntoView({ behavior: "smooth" })} />

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                    <div className="col-span-2 md:col-span-1">
                      <StreakCard streak={streak} dots={dots} />
                    </div>
                    <WeeklyGoal done={weeklyDone} goal={goal} onGoal={setGoal} />
                    <section className="dash-card flex flex-col items-center justify-center gap-3 p-4 text-center sm:p-5 md:flex-row md:gap-4 md:text-left" aria-label="Overall coverage">
                      <ProgressRing value={coverage} size={84} stroke={9} color="#CC310E" label={`${coverage} percent of all lectures watched`}>
                        <span className="text-lg font-black text-slate-900"><CountUp value={coverage} suffix="%" /></span>
                      </ProgressRing>
                      <div>
                        <p className="text-sm font-black text-[#075985]">Course coverage</p>
                        <p className="mt-1 text-xs font-semibold text-slate-600">{completedCount} of {videos.length} lectures</p>
                        <p className="text-xs font-semibold text-slate-600">{stats.filter((s) => s.total > 0 && s.done === s.total).length} of {stats.length} chapters</p>
                      </div>
                    </section>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {(["PHYSICS", "CHEMISTRY"] as const).map((s, i) => {
                      const physics = s === "PHYSICS";
                      const t = bySubject[s];
                      const pct = t.total ? Math.round((t.done / t.total) * 100) : 0;
                      return (
                        <motion.button
                          key={s}
                          type="button"
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigate({ view: "lectures", subject: s })}
                          className={`dash-card dash-lift group flex items-center gap-4 p-6 text-left ${physics ? "" : "!border-[#CC310E]/25"}`}
                        >
                          <GlowIcon icon={physics ? Atom : FlaskConical} offset={i * 2} size="lg" />
                          <span className="min-w-0 flex-1">
                            <span className={`block text-[10px] font-black uppercase tracking-widest ${physics ? "text-[#0369A1]" : "text-[#CC310E]"}`}>Sector 0{i + 1}</span>
                            <span className="block text-xl font-black text-[#075985]">{physics ? "Physics Engine" : "Chemistry Lab"}</span>
                            <span className="mt-1 block text-xs font-semibold text-slate-500">{t.done} of {t.total} lectures · {pct}%</span>
                            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <span className={`block h-full rounded-full transition-all duration-700 ${physics ? "bg-sky-500" : "bg-[#CC310E]"}`} style={{ width: `${pct}%` }} />
                            </span>
                          </span>
                          <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1" />
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="grid items-start gap-6 lg:grid-cols-12">
                    <div className="space-y-6 lg:col-span-7">
                      <DueToday plans={state.plans} today={today} onOpenPlan={openPlan} />
                      {upNext.length > 0 && (
                        <section className="dash-card p-5" aria-label="Up next">
                          <h3 className="mb-3 text-sm font-black text-[#075985]">Up next</h3>
                          <ul className="space-y-2">
                            {upNext.map((v) => (
                              <li key={v.id}>
                                <button type="button" onClick={() => openLecture(v)} className="flex min-h-[56px] w-full items-center gap-3 rounded-xl bg-[#F3F8FC] p-3 text-left active:bg-sky-100">
                                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-black ${subjectKey(v.subject) === "PHYSICS" ? "bg-sky-100 text-[#0369A1]" : "bg-[#FDE2D9] text-[#CC310E]"}`}>#{v.lecture_no}</span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-xs font-bold text-slate-900">{v.topic || v.title}</span>
                                    <span className="block truncate text-[10px] text-slate-500">{v.chapter}</span>
                                  </span>
                                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                    </div>
                    <div className="lg:col-span-5">
                      <StudyCalendar plans={state.plans} today={today} onPick={setPlanDay} />
                    </div>
                  </div>

                  <div id="practice-lab" className="scroll-mt-24">
                    <PracticeLab onOpen={setSimId} />
                  </div>
                  <BadgesGrid badges={badges} />
                </>
              )}
            </motion.div>
          )}

          {/* ---------------- LECTURES ---------------- */}
          {!isExpired && !searching && view === "lectures" && (
            <motion.div key={`${subject}:${chapter ?? ""}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="space-y-6">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  {chapter && (
                    <button type="button" onClick={() => navigate({ view: "lectures", subject })} aria-label="Back to chapters" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D3E3EF] bg-white text-slate-700 active:scale-95">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  )}
                  {heading(chapter ? chapter : "Video Lectures")}
                </div>
                {!chapter && (
                  <div role="tablist" aria-label="Subject" className="relative flex rounded-2xl border border-[#D3E3EF] bg-white p-1 shadow-sm">
                    {(["PHYSICS", "CHEMISTRY"] as const).map((s) => {
                      const on = subject === s;
                      return (
                        <button key={s} type="button" role="tab" aria-selected={on} onClick={() => navigate({ view: "lectures", subject: s }, true)} className={`relative flex h-11 items-center gap-2 rounded-xl px-5 text-xs font-extrabold transition-colors ${on ? "text-white" : "text-slate-600"}`}>
                          {on && <motion.span layoutId="subject-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} className={`absolute inset-0 rounded-xl ${s === "PHYSICS" ? "bg-[#0369A1]" : "bg-[#CC310E]"}`} />}
                          <span className="relative flex items-center gap-2">
                            {s === "PHYSICS" ? <Atom className="h-4 w-4" /> : <FlaskConical className="h-4 w-4" />}
                            {s === "PHYSICS" ? "Physics" : "Chemistry"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {showSkeleton ? (
                <GridSkeleton />
              ) : !chapter ? (
                chaptersOfSubject.length === 0 ? (
                  <div className="dash-card p-12 text-center text-sm font-semibold text-slate-500">No {subject === "PHYSICS" ? "Physics" : "Chemistry"} lectures have been published yet.</div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {chaptersOfSubject.map((s) => (
                      <ChapterCard key={s.chapter} stat={s} materials={(materialsByChapter[s.chapter] || []).length} hasSim={simForChapter(s.chapter, s.subject) !== null} onOpen={(c) => navigate({ view: "lectures", subject, chapter: c })} />
                    ))}
                  </div>
                )
              ) : lecturesOfChapter.length === 0 ? (
                <div className="dash-card space-y-3 p-12 text-center text-sm font-semibold text-slate-500">
                  <p>This chapter has no lectures.</p>
                  <button type="button" onClick={() => navigate({ view: "lectures", subject })} className="text-[#0369A1] underline">Back to chapters</button>
                </div>
              ) : (
                <div className="space-y-6">
                  {chapterSim && <ChapterSimBanner simId={chapterSim} onOpen={setSimId} />}
                  <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0" aria-label="Ask the AI tutor">
                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500"><Sparkles className="h-3.5 w-3.5 text-[#CC310E]" /> Ask AI</span>
                    {[
                      ["Explain simply", `"${chapter}" অধ্যায়ের মূল ধারণাগুলো সহজ ভাষায় বুঝিয়ে দাও।`],
                      ["Practice questions", `"${chapter}" অধ্যায় থেকে ৫টি অনুশীলনী প্রশ্ন দাও (উত্তরসহ)।`],
                      ["Common mistakes", `"${chapter}" অধ্যায়ে শিক্ষার্থীরা সাধারণত কী কী ভুল করে এবং কীভাবে এড়ানো যায়?`],
                    ].map(([label, prompt]) => (
                      <button key={label} type="button" onClick={() => askAi(prompt)} className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#D3E3EF] bg-white px-4 text-xs font-bold text-[#075985] shadow-sm active:scale-95">
                        <Bot className="h-3.5 w-3.5" /> {label}
                      </button>
                    ))}
                  </div>
                  {renderLectureCards(lecturesOfChapter)}
                  {(materialsByChapter[chapter] || []).length > 0 && (
                    <section className="space-y-3" aria-label="Study sheets for this chapter">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#075985]">Study sheets for this chapter</h3>
                      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {materialsByChapter[chapter].map((m) => (
                          <MaterialCard key={m.id} material={m} onPreview={(mat) => { setPdfLoading(true); setPdf({ url: getDrivePreviewUrl(mat.pdf_url || mat.file_url || ""), raw: mat.pdf_url || mat.file_url || "", title: mat.title }); }} />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ---------------- MATERIALS ---------------- */}
          {!isExpired && !searching && view === "materials" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="space-y-6">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                {heading("Study Materials & PDFs", "Preview handouts here or download them for offline revision.")}
                <div className="flex rounded-2xl border border-[#D3E3EF] bg-white p-1 shadow-sm" role="group" aria-label="Filter by subject">
                  {(["ALL", "PHYSICS", "CHEMISTRY"] as const).map((f) => (
                    <button key={f} type="button" aria-pressed={materialFilter === f} onClick={() => setMaterialFilter(f)} className={`h-11 rounded-xl px-4 text-xs font-extrabold transition-colors ${materialFilter === f ? "bg-[#075985] text-white" : "text-slate-600"}`}>
                      {f === "ALL" ? "All" : f === "PHYSICS" ? "Physics" : "Chemistry"}
                    </button>
                  ))}
                </div>
              </div>
              {showSkeleton ? (
                <GridSkeleton count={6} />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {materials
                    .filter((m) => materialFilter === "ALL" || subjectKey(m.subject) === materialFilter)
                    .map((m) => (
                      <MaterialCard key={m.id} material={m} onPreview={(mat) => { setPdfLoading(true); setPdf({ url: getDrivePreviewUrl(mat.pdf_url || mat.file_url || ""), raw: mat.pdf_url || mat.file_url || "", title: mat.title }); }} />
                    ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ---------------- AI ---------------- */}
          {!isExpired && !searching && view === "ai" && (
            <div className="h-[calc(100dvh-11rem)] min-h-[520px] overflow-hidden rounded-3xl border border-[#D3E3EF] bg-white shadow-sm md:h-[calc(100dvh-9rem)]">
              <EduTrackAiChat isEmbedded />
            </div>
          )}
        </main>

        <SiteFooter />
      </div>

      <MobileDock view={view} onNavigate={go} />

      {/* Floating AI button */}
      {!isExpired && view !== "ai" && (
        <motion.button
          type="button"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setChat({ open: true })}
          aria-label="Open AI tutor"
          className="fixed bottom-24 right-4 z-40 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#075985] to-[#0369A1] text-white shadow-xl shadow-sky-900/25 md:bottom-8 md:right-8"
        >
          <Bot className="h-7 w-7" />
          <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#CC310E]" />
        </motion.button>
      )}
      {chat.open && <EduTrackAiChat isOpen initialPrompt={chat.prompt} onClose={() => setChat({ open: false })} />}

      <AnimatePresence>
        {noticeOpen && notice && <NoticeSheet key="notice" notice={notice} onClose={() => setNoticeOpen(false)} />}
        {planDay && (
          <DayPlanSheet key="plan" dateKey={planDay} plans={state.plans} onAdd={addPlan} onRemove={removePlan} onOpenPlan={openPlan} onClose={() => setPlanDay(null)} />
        )}
        {simOpen && <SimModal key={simOpen.id} sim={simOpen} onClose={() => setSimId(null)} />}
        {pdf && (
          <Sheet
            key="pdf"
            title={pdf.title}
            size="lg"
            onClose={() => setPdf(null)}
            headerExtra={
              <a href={pdf.raw} target="_blank" rel="noopener noreferrer" className="hidden h-11 items-center gap-1.5 rounded-full border border-[#D3E3EF] bg-white px-4 text-xs font-bold text-[#075985] sm:flex">
                <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
              </a>
            }
          >
            <div className="relative h-full min-h-[300px]">
              {pdfLoading && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                  <Loader2 className="h-7 w-7 animate-spin" />
                </div>
              )}
              <iframe src={pdf.url} title={pdf.title} onLoad={() => setPdfLoading(false)} className="relative h-full min-h-[300px] w-full border-none" />
            </div>
          </Sheet>
        )}
      </AnimatePresence>

      <Celebration event={celebration} onDone={() => setCelebration(null)} />
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F3F8FC]">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#D3E3EF] border-t-[#CC310E]" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
