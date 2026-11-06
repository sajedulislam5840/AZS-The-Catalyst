"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award, PartyPopper, Sparkles } from "lucide-react";

export interface CelebrationEvent {
  id: number;
  title: string;
  text: string;
  kind: "badge" | "level" | "chapter" | "lecture";
}

const COLORS = ["#0EA5E9", "#CC310E", "#F59E0B", "#14B8A6", "#8B5CF6"];
const ICONS = { badge: Award, level: Sparkles, chapter: PartyPopper, lecture: PartyPopper } as const;

/** Small, fixed set of paper pieces; the layout is computed once per burst. */
function Confetti({ seed }: { seed: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        // Cheap deterministic spread, no Math.random in render.
        const a = ((i * 137.5 + seed * 29) % 360) * (Math.PI / 180);
        const dist = 90 + ((i * 53 + seed * 7) % 110);
        return {
          dx: Math.cos(a) * dist,
          dy: Math.sin(a) * dist - 50,
          rot: ((i * 97) % 540) - 270,
          color: COLORS[i % COLORS.length],
        };
      }),
    [seed],
  );
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="dash-confetti"
          style={{ background: p.color, ["--dx" as string]: `${p.dx}px`, ["--dy" as string]: `${p.dy}px`, ["--rot" as string]: `${p.rot}deg` }}
        />
      ))}
    </div>
  );
}

/** A toast with a confetti burst for a finished chapter, a new badge or a new level. */
export default function Celebration({ event, onDone }: { event: CelebrationEvent | null; onDone: () => void }) {
  useEffect(() => {
    if (!event) return;
    const t = setTimeout(onDone, 3800);
    return () => clearTimeout(t);
  }, [event, onDone]);

  const Icon = event ? ICONS[event.kind] : Award;
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 bottom-24 z-[70] mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl md:bottom-8"
        >
          <Confetti seed={event.id} />
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-[#FDE2D9] text-[#CC310E]">
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-slate-900">{event.title}</p>
            <p className="text-xs text-slate-600">{event.text}</p>
          </div>
          <button type="button" onClick={onDone} aria-label="Dismiss" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
