"use client";

import { Minus, Plus, Target } from "lucide-react";
import ProgressRing from "./ProgressRing";
import CountUp from "./CountUp";

export const MIN_GOAL = 1;
export const MAX_GOAL = 14;

export default function WeeklyGoal({ done, goal, onGoal }: { done: number; goal: number; onGoal: (n: number) => void }) {
  const reached = done >= goal;
  const pct = Math.min(100, Math.round((done / goal) * 100));
  return (
    <section className="dash-card flex flex-col justify-between p-5" aria-label="Weekly goal">
      <div className="flex items-center gap-4">
        <ProgressRing value={pct} size={76} stroke={8} color={reached ? "#CC310E" : "#0369A1"} label={`${done} of ${goal} lectures this week`}>
          <span className="text-lg font-black text-slate-900">
            <CountUp value={done} />
            <span className="text-xs font-bold text-slate-400">/{goal}</span>
          </span>
        </ProgressRing>
        <div>
          <p className="flex items-center gap-1.5 text-sm font-black text-[#075985]">
            <Target className="h-4 w-4 text-[#CC310E]" /> Weekly goal
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-600">{reached ? "Goal reached. Great week!" : `${goal - done} more lecture${goal - done === 1 ? "" : "s"} to go`}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-[#F3F8FC] p-1.5">
        <button
          type="button"
          onClick={() => onGoal(Math.max(MIN_GOAL, goal - 1))}
          disabled={goal <= MIN_GOAL}
          aria-label="Lower weekly goal"
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm active:scale-95 disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="text-xs font-bold text-slate-600">{goal} lectures a week</span>
        <button
          type="button"
          onClick={() => onGoal(Math.min(MAX_GOAL, goal + 1))}
          disabled={goal >= MAX_GOAL}
          aria-label="Raise weekly goal"
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm active:scale-95 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
