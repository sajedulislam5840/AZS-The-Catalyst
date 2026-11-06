"use client";

import { memo } from "react";
import { FolderOpen, Gamepad2 } from "lucide-react";
import type { ChapterStat } from "@/lib/progress";
import ProgressRing from "./ProgressRing";

interface Props {
  stat: ChapterStat;
  materials: number;
  hasSim: boolean;
  onOpen: (chapter: string) => void;
}

function ChapterCard({ stat, materials, hasSim, onOpen }: Props) {
  const physics = stat.subject !== "CHEMISTRY";
  const complete = stat.total > 0 && stat.done === stat.total;
  return (
    <button
      type="button"
      onClick={() => onOpen(stat.chapter)}
      className={`dash-card dash-lift flex w-full items-center gap-4 p-5 text-left ${complete ? "!border-[#CC310E]/40" : ""}`}
    >
      <ProgressRing value={stat.pct} size={64} stroke={7} color={complete ? "#CC310E" : physics ? "#0369A1" : "#DC4A22"} label={`${stat.chapter}: ${stat.pct} percent complete`}>
        {complete ? <span className="text-lg text-[#CC310E]">✓</span> : <span className="text-xs font-black text-slate-800">{stat.pct}%</span>}
      </ProgressRing>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-base font-black leading-snug text-slate-900">{stat.chapter}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500">
          <span className="flex items-center gap-1"><FolderOpen className="h-3.5 w-3.5" /> {stat.done}/{stat.total} lectures</span>
          <span>{materials} PDF</span>
          {hasSim && (
            <span className="flex items-center gap-1 text-[#CC310E]"><Gamepad2 className="h-3.5 w-3.5" /> Sim</span>
          )}
        </span>
      </span>
    </button>
  );
}

export default memo(ChapterCard);
