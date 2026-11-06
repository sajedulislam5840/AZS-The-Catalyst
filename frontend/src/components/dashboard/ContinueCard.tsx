"use client";

import { motion } from "framer-motion";
import { ArrowRight, FlaskConical, Play, Trophy } from "lucide-react";
import { formatClock, type Resume } from "@/lib/progress";
import { getYouTubeThumb } from "@/lib/media";
import type { VideoLecture } from "@/lib/dashboard-types";

interface Props {
  resume: Resume;
  duration: number;
  loading: boolean;
  hasLectures: boolean;
  onOpen: (lecture: VideoLecture) => void;
  onLab: () => void;
}

const HEAD: Record<Resume["kind"], string> = {
  resume: "Continue where you left off",
  next: "Up next for you",
  start: "Start your first lecture",
  done: "Everything watched",
};

export default function ContinueCard({ resume, duration, loading, hasLectures, onOpen, onLab }: Props) {
  const lecture = resume.lecture as VideoLecture | null;

  if (!loading && resume.kind === "done") {
    return (
      <section className="dash-card flex flex-col items-start gap-4 bg-gradient-to-br from-white to-[#FEF3EF] p-6 sm:flex-row sm:items-center" aria-label="All lectures watched">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <Trophy className="h-7 w-7" />
        </span>
        <div className="flex-1">
          <p className="text-lg font-black text-slate-900">{hasLectures ? "You finished every lecture" : "No lectures yet"}</p>
          <p className="text-sm text-slate-600">{hasLectures ? "Keep it sharp with the practice simulations, or revise from your planner." : "New lectures will show up here as soon as they are published."}</p>
        </div>
        <button type="button" onClick={onLab} className="inline-flex h-12 items-center gap-2 rounded-full bg-[#CC310E] px-5 text-sm font-extrabold text-white shadow-[0_8px_24px_-8px_rgba(204,49,14,0.7)] active:scale-95">
          <FlaskConical className="h-4 w-4" /> Open practice lab
        </button>
      </section>
    );
  }

  if (!lecture) return null;
  const thumb = getYouTubeThumb(lecture.youtube_url || lecture.video_url || "");
  const pct = duration > 0 && resume.position > 0 ? Math.min(100, Math.round((resume.position / duration) * 100)) : 0;
  const physics = lecture.subject.toUpperCase() !== "CHEMISTRY";

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="dash-card relative overflow-hidden"
      aria-label={HEAD[resume.kind]}
    >
      <div className={`absolute inset-x-0 top-0 h-1.5 ${physics ? "bg-gradient-to-r from-sky-400 to-sky-600" : "bg-gradient-to-r from-[#DC4A22] to-[#CC310E]"}`} />
      <div className="flex flex-col gap-4 p-4 pt-5 sm:flex-row sm:items-center sm:p-5 sm:pt-6">
        <button
          type="button"
          onClick={() => onOpen(lecture)}
          aria-label={`Play ${lecture.topic || lecture.title}`}
          className="group relative aspect-video w-full shrink-0 overflow-hidden rounded-2xl bg-slate-900 sm:w-56"
        >
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-300 group-hover:scale-105" />
          )}
          <span className="absolute inset-0 bg-slate-900/25" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="dash-sheen relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#CC310E] text-white shadow-lg transition group-hover:scale-110">
              <Play className="ml-0.5 h-6 w-6 fill-current" />
            </span>
          </span>
          {pct > 0 && (
            <span className="absolute inset-x-0 bottom-0 h-1.5 bg-white/40">
              <span className="block h-full bg-[#CC310E]" style={{ width: `${pct}%` }} />
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#CC310E]">{HEAD[resume.kind]}</p>
          <h2 className="line-clamp-2 text-lg font-black leading-snug text-slate-900 sm:text-xl">{lecture.topic || lecture.title}</h2>
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${physics ? "bg-sky-100 text-[#0369A1]" : "bg-[#FDE2D9] text-[#A8270B]"}`}>{physics ? "Physics" : "Chemistry"}</span>
            <span className="truncate">{lecture.chapter}</span>
            <span>Lecture {lecture.lecture_no}</span>
            {resume.position > 10 && <span className="text-slate-700">Stopped at {formatClock(resume.position)}</span>}
          </p>
          <button
            type="button"
            onClick={() => onOpen(lecture)}
            className="mt-1 inline-flex h-12 items-center gap-2 rounded-full bg-[#CC310E] px-6 text-sm font-extrabold text-white shadow-[0_8px_24px_-8px_rgba(204,49,14,0.7)] transition hover:bg-[#A8270B] active:scale-95"
          >
            {resume.kind === "resume" ? "Resume lecture" : "Start lecture"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.section>
  );
}
