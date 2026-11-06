"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Bot, Check, ChevronDown, Download, FileEdit, Flag } from "lucide-react";
import { formatClock, type LectureProgress } from "@/lib/progress";
import type { VideoLecture } from "@/lib/dashboard-types";
import LecturePlayer, { type PlayerHandle } from "./LecturePlayer";

interface Props {
  lecture: VideoLecture;
  progress?: LectureProgress;
  note: string;
  autoPlay?: boolean;
  highlight?: boolean;
  onOpen: (lecture: VideoLecture) => void;
  onSavePosition: (id: string, position: number, duration: number) => void;
  onSetCompleted: (lecture: VideoLecture, completed: boolean) => void;
  onSaveNote: (id: string, content: string) => void;
  onAskAi: (prompt: string) => void;
}

function LectureCard({ lecture, progress, note, autoPlay, highlight, onOpen, onSavePosition, onSetCompleted, onSaveNote, onAskAi }: Props) {
  const completed = Boolean(progress?.completed);
  const title = lecture.topic || lecture.title || `Lecture ${lecture.lecture_no}`;
  const playerRef = useRef<PlayerHandle>(null);
  const cardRef = useRef<HTMLElement>(null);

  const [notesOpen, setNotesOpen] = useState(false);
  const [text, setText] = useState(note);
  const [saved, setSaved] = useState(false);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef(text);
  const saveRef = useRef(onSaveNote);
  useEffect(() => {
    textRef.current = text;
    saveRef.current = onSaveNote;
  });

  // A note changed from another device while this card is idle replaces the text; edits in progress are never overwritten.
  useEffect(() => {
    if (!dirty.current) {
      setText(note);
    }
  }, [note]);

  const commit = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    saveRef.current(lecture.id, textRef.current);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [lecture.id]);

  // Save anything typed but not yet sent when the card goes away.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (dirty.current) saveRef.current(lecture.id, textRef.current);
    },
    [lecture.id],
  );

  useEffect(() => {
    if (autoPlay) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [autoPlay]);

  const edit = (value: string) => {
    setText(value);
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(commit, 700);
  };

  const stamp = () => {
    const t = formatClock(playerRef.current?.getTime() ?? 0);
    edit(`${text}${text && !text.endsWith("\n") ? "\n" : ""}[${t}] `);
  };

  const exportNotes = () => {
    const blob = new Blob(
      [`AZS: The Catalyst - Revision Notes\nSubject: ${lecture.subject}\nChapter: ${lecture.chapter}\nLecture #${lecture.lecture_no}: ${title}\n----------------------------------------\n\n`, text || "No notes recorded for this lecture."],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Lecture_${lecture.lecture_no}_Notes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pos = progress?.position ?? 0;
  const dur = progress?.duration ?? 0;
  const pct = !completed && dur > 0 && pos > 0 ? Math.min(100, Math.round((pos / dur) * 100)) : 0;
  // Re-opening a lecture that was watched to the end should start from the beginning.
  const startAt = dur > 0 && pos / dur > 0.95 ? 0 : pos;

  return (
    <article ref={cardRef} className={`dash-card flex flex-col overflow-hidden ${highlight ? "ring-2 ring-[#CC310E]/50" : ""}`}>
      <LecturePlayer
        ref={playerRef}
        url={lecture.youtube_url || lecture.video_url || ""}
        title={title}
        lectureNo={lecture.lecture_no}
        startAt={startAt}
        autoPlay={autoPlay}
        onStart={() => onOpen(lecture)}
        onSave={(p, d) => onSavePosition(lecture.id, p, d)}
        onComplete={() => onSetCompleted(lecture, true)}
      />
      {pct > 0 && (
        <div className="h-1 bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Watched so far">
          <div className="h-full bg-[#CC310E]" style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="flex-1 space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#D3E3EF] bg-slate-50 px-2.5 py-0.5 text-[10px] font-black text-slate-700">Lec #{lecture.lecture_no}</span>
          {completed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FDE2D9] px-2.5 py-0.5 text-[10px] font-black text-[#A8270B]">
              <Check className="h-3 w-3" /> Completed
            </span>
          )}
          {pct > 0 && <span className="text-[10px] font-bold text-slate-500">{formatClock(pos)} / {formatClock(dur)}</span>}
        </div>
        <h3 className="text-sm font-bold leading-snug text-slate-900">{title}</h3>

        <div className="overflow-hidden rounded-xl border border-[#D3E3EF] bg-[#F3F8FC]">
          <button
            type="button"
            onClick={() => setNotesOpen((o) => !o)}
            aria-expanded={notesOpen}
            className="flex h-12 w-full items-center justify-between px-4 text-xs font-bold text-slate-700"
          >
            <span className="flex items-center gap-2">
              <FileEdit className="h-4 w-4 text-[#0369A1]" /> My notes {text.trim() && <span className="h-1.5 w-1.5 rounded-full bg-[#CC310E]" aria-label="has notes" />}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${notesOpen ? "rotate-180" : ""}`} />
          </button>
          {notesOpen && (
            <div className="space-y-3 border-t border-[#D3E3EF] bg-white p-3">
              <textarea
                rows={4}
                aria-label={`Notes for ${title}`}
                placeholder="Key formulas, steps, doubts..."
                value={text}
                onChange={(e) => edit(e.target.value)}
                onBlur={commit}
                className="w-full resize-y rounded-xl border border-[#D3E3EF] bg-[#F3F8FC] p-3 text-slate-900 outline-none focus:border-[#0369A1] focus:ring-2 focus:ring-[#0369A1]/20"
              />
              <div className="flex items-center justify-between text-[11px]">
                <button type="button" onClick={stamp} className="flex min-h-[44px] items-center gap-1.5 px-1 font-bold text-[#0369A1]">
                  <Flag className="h-3.5 w-3.5" /> Add timestamp
                </button>
                <span className={`font-bold text-emerald-600 transition-opacity ${saved ? "opacity-100" : "opacity-0"}`} aria-live="polite">{saved ? "Saved" : ""}</span>
                <button type="button" onClick={exportNotes} className="flex min-h-[44px] items-center gap-1.5 px-1 font-bold text-slate-600">
                  <Download className="h-3.5 w-3.5" /> Export
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 p-5 pt-0">
        <button
          type="button"
          onClick={() => onSetCompleted(lecture, !completed)}
          aria-pressed={completed}
          className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-extrabold transition active:scale-[0.97] ${
            completed ? "border border-[#FAC3B0] bg-[#FEF3EF] text-[#A8270B]" : "bg-[#CC310E] text-white shadow-[0_8px_20px_-8px_rgba(204,49,14,0.7)] hover:bg-[#A8270B]"
          }`}
        >
          <Check className="h-4 w-4" /> {completed ? "Completed" : "Mark as watched"}
        </button>
        <button
          type="button"
          onClick={() => onAskAi(`"${title}" লেকচারের মূল পয়েন্টগুলো সংক্ষেপে বুঝিয়ে দাও এবং গুরুত্বপূর্ণ সূত্রগুলো লেখো।`)}
          aria-label="Ask the AI tutor about this lecture"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#D3E3EF] bg-white text-[#0369A1] active:scale-95"
        >
          <Bot className="h-5 w-5" />
        </button>
      </div>
    </article>
  );
}

export default memo(LectureCard);
