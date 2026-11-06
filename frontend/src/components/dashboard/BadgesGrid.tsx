"use client";

import { Atom, Flame, FileEdit, Lock, Sparkles, Target, Trophy, Zap, type LucideIcon } from "lucide-react";
import type { Badge } from "@/lib/progress";
import GlowIcon from "@/components/ui/GlowIcon";

const ICONS: Record<string, LucideIcon> = {
  "first-spark": Sparkles,
  "on-a-roll": Flame,
  "week-warrior": Zap,
  "note-taker": FileEdit,
  "chapter-master": Trophy,
  "both-worlds": Atom,
  halfway: Target,
};

export default function BadgesGrid({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <section aria-label="Badges" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#075985]">Badges</h3>
        <span className="text-xs font-bold text-slate-500">
          {earned} of {badges.length} earned
        </span>
      </div>
      <ul className="dash-scroll-x -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-7">
        {badges.map((b, i) => {
          const Icon = ICONS[b.id] ?? Sparkles;
          return (
            <li key={b.id} className={`dash-card w-36 shrink-0 p-4 text-center sm:w-auto ${b.earned ? "" : "bg-slate-50/80"}`}>
              <div className="mx-auto flex h-12 w-12 items-center justify-center">
                {b.earned ? (
                  <GlowIcon icon={Icon} offset={i} size="lg" />
                ) : (
                  <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Icon className="h-6 w-6 opacity-50" />
                    <Lock className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white p-0.5 text-slate-400" />
                  </span>
                )}
              </div>
              <p className={`mt-3 text-xs font-black ${b.earned ? "text-slate-900" : "text-slate-500"}`}>{b.title}</p>
              <p className="mt-0.5 min-h-[2.2em] text-[10px] leading-snug text-slate-500">{b.hint}</p>
              {!b.earned && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={Math.round(b.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${b.title} progress`}>
                  <div className="h-full rounded-full bg-sky-400 transition-all duration-700" style={{ width: `${Math.round(b.progress * 100)}%` }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
