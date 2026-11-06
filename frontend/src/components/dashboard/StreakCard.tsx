"use client";

import { Flame } from "lucide-react";
import type { Streak, WeekDot } from "@/lib/progress";
import CountUp from "./CountUp";

const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const letterFor = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return LETTERS[new Date(y, m - 1, d).getDay()];
};

export default function StreakCard({ streak, dots }: { streak: Streak; dots: WeekDot[] }) {
  const alive = streak.current > 0;
  const message = streak.activeToday
    ? "Done for today. See you tomorrow!"
    : alive
      ? `Study today to keep your ${streak.current}-day streak.`
      : "Watch a lecture today to start a streak.";

  return (
    <section className="dash-card flex flex-col justify-between p-5" aria-label="Study streak">
      <div className="flex items-center gap-3">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${alive ? "bg-amber-100 text-amber-500" : "bg-slate-100 text-slate-400"}`}>
          <Flame className={`h-7 w-7 ${alive ? "dash-flame" : ""}`} />
        </span>
        <div>
          <p className="text-3xl font-black leading-none text-slate-900">
            <CountUp value={streak.current} />
            <span className="ml-1 text-sm font-bold text-slate-500">{streak.current === 1 ? "day" : "days"}</span>
          </p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Best: {streak.best}</p>
        </div>
      </div>

      <ul className="mt-4 flex justify-between" aria-label="Last seven days">
        {dots.map((d) => (
          <li key={d.day} className="flex flex-col items-center gap-1.5">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black transition-colors ${
                d.active ? "bg-gradient-to-br from-amber-400 to-[#CC310E] text-white shadow-md shadow-amber-500/30" : d.isToday ? "border-2 border-dashed border-sky-300 text-sky-600" : "bg-slate-100 text-slate-400"
              }`}
              aria-label={`${d.day}${d.active ? ": studied" : ""}`}
            >
              {d.active ? "✓" : ""}
            </span>
            <span className={`text-[10px] font-bold ${d.isToday ? "text-[#075985]" : "text-slate-400"}`}>{letterFor(d.day)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs font-semibold text-slate-600">{message}</p>
    </section>
  );
}
