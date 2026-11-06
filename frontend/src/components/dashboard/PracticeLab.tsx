"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";
import GlowIcon from "@/components/ui/GlowIcon";
import { SIMS } from "@/components/landing/SimulationsSection";
import type { SimId } from "@/lib/chapter-sims";

/** The four simulations as a row of tiles: practice any time, no matter which chapter you are on. */
export default function PracticeLab({ onOpen }: { onOpen: (id: SimId) => void }) {
  return (
    <section aria-label="Practice lab" className="space-y-3">
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-[#075985]">Practice lab</h3>
        <p className="mt-1 text-xs text-slate-500">Play with the variables. Each one takes a few minutes.</p>
      </div>
      <div className="dash-scroll-x -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {SIMS.map((s, i) => {
          const physics = s.subject === "physics";
          return (
            <motion.button
              key={s.id}
              type="button"
              onClick={() => onOpen(s.id as SimId)}
              whileTap={{ scale: 0.97 }}
              className={`dash-card dash-lift flex w-64 shrink-0 flex-col items-start gap-3 p-4 text-left sm:w-auto ${physics ? "" : "!border-[#CC310E]/25"}`}
            >
              <GlowIcon icon={s.icon} offset={i + 2} />
              <span>
                <span className="block text-sm font-black text-slate-900">{s.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{s.text}</span>
              </span>
              <span className="mt-auto inline-flex items-center gap-1.5 rounded-full bg-[#CC310E] px-3.5 py-2 text-xs font-extrabold text-white">
                <Play className="h-3.5 w-3.5 fill-current" /> Play
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

/** A banner inside a chapter that suggests the simulation matching it. */
export function ChapterSimBanner({ simId, onOpen }: { simId: SimId; onOpen: (id: SimId) => void }) {
  const sim = SIMS.find((s) => s.id === simId);
  if (!sim) return null;
  return (
    <div className="dash-card flex items-center gap-4 border-[#CC310E]/25 bg-gradient-to-r from-white to-[#FEF3EF] p-4">
      <GlowIcon icon={sim.icon} offset={1} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#CC310E]">Practise this chapter</p>
        <p className="truncate text-sm font-black text-slate-900">{sim.title}</p>
        <p className="line-clamp-1 text-xs text-slate-500">{sim.goal}</p>
      </div>
      <button type="button" onClick={() => onOpen(simId)} className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#CC310E] px-4 text-xs font-extrabold text-white shadow-[0_8px_24px_-8px_rgba(204,49,14,0.7)] active:scale-95">
        <Play className="h-3.5 w-3.5 fill-current" /> Play
      </button>
    </div>
  );
}
