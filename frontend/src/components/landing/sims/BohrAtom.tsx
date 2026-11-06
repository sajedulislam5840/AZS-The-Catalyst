"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, RotateCcw } from "lucide-react";
import {
  CHALLENGES,
  MAX_LEVEL,
  levelEnergy,
  seriesName,
  spectralRegion,
  transitionEnergy,
  wavelengthNm,
  wavelengthToColor,
  type Transition,
} from "@/lib/sim-bohr";
import { ScoreBar, ghostBtn } from "./SimUI";

const C = 150;
const radius = (n: number) => 22 + (n - 1) * 24; // compressed for display, not to scale

interface Event extends Transition {
  energy: number;
  nm: number;
  region: string;
  series: string;
  color: string | null;
}

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
// Energy ladder geometry: -13.6 eV at the bottom, 0 at the top.
const ladderY = (n: number) => 20 + (-levelEnergy(n) / 13.6) * 200;

export default function BohrAtom() {
  const [level, setLevel] = useState(1);
  const [event, setEvent] = useState<Event | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);

  const goTo = (n: number) => {
    if (n === level) return;
    const t: Transition = { type: n > level ? "absorb" : "emit", from: level, to: n };
    const nm = wavelengthNm(level, n);
    setEvent({
      ...t,
      energy: transitionEnergy(level, n),
      nm,
      region: spectralRegion(nm),
      series: seriesName(level, n),
      color: wavelengthToColor(nm),
    });
    setLevel(n);
    setMoves((m) => m + 1);
    setDone((d) => {
      const fresh = CHALLENGES.filter((c) => c.done(t) && !d.includes(c.id)).map((c) => c.id);
      return fresh.length ? [...d, ...fresh] : d;
    });
  };

  const reset = () => {
    setLevel(1);
    setEvent(null);
    setDone([]);
    setMoves(0);
  };

  return (
    <div className="space-y-5">
      <ScoreBar items={[{ label: "Level", value: `n = ${level}` }, { label: "Jumps", value: moves }, { label: "Challenges", value: `${done.length}/${CHALLENGES.length}` }]} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Atom */}
        <div className="overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50 to-white">
          <svg viewBox="0 0 300 300" className="mx-auto block h-auto w-full max-w-sm" role="img" aria-label={`Hydrogen atom, electron at level ${level}`}>
            {LEVELS.map((n) => (
              <g key={n}>
                <circle cx={C} cy={C} r={radius(n)} fill="none" stroke={n === level ? "#0284C7" : "#BAE6FD"} strokeWidth={n === level ? 2 : 1.2} strokeDasharray={n === level ? undefined : "3 4"} />
                <circle cx={C} cy={C} r={radius(n)} fill="none" stroke="transparent" strokeWidth="14" className="cursor-pointer" onClick={() => goTo(n)} />
                <text x={C + radius(n) * 0.707 + 3} y={C - radius(n) * 0.707 - 3} fontSize="10" fill="#64748B" fontFamily="var(--font-geist-mono)">
                  {n}
                </text>
              </g>
            ))}
            <circle cx={C} cy={C} r="10" fill="#CC310E" />
            <text x={C} y={C + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="white">p⁺</text>
            <g className="azs-spin" style={{ transformOrigin: `${C}px ${C}px`, animation: `azs-spin ${1.4 * Math.pow(level, 1.5)}s linear infinite` }}>
              <motion.circle initial={false} animate={{ cx: C + radius(level) }} cy={C} r="7" fill="#0369A1" transition={{ type: "spring", stiffness: 140, damping: 18 }} />
            </g>
          </svg>
          <div className="flex flex-wrap justify-center gap-2 px-3 pb-4" role="group" aria-label="Move electron to level">
            {LEVELS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => goTo(n)}
                aria-pressed={n === level}
                aria-label={`Move electron to level ${n}`}
                className={`h-10 w-10 rounded-full border text-sm font-extrabold transition ${
                  n === level ? "border-sky-600 bg-sky-600 text-white" : "border-sky-200 bg-white text-slate-700 hover:border-sky-400"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Readout, ladder, challenges */}
        <div className="space-y-4">
          <div role="status" className="rounded-2xl border border-sky-200 bg-white p-4">
            {event ? (
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 h-10 w-10 shrink-0 rounded-full border border-slate-300"
                  style={event.color ? { background: event.color, boxShadow: `0 0 18px ${event.color}` } : { background: "repeating-linear-gradient(45deg,#E2E8F0,#E2E8F0 4px,#F8FAFC 4px,#F8FAFC 8px)" }}
                  aria-hidden="true"
                />
                <div className="text-sm">
                  <p className="font-extrabold text-slate-900">
                    {event.type === "absorb" ? "Photon absorbed" : "Photon emitted"}: n = {event.from} → {event.to}
                  </p>
                  <p className="mt-0.5 text-slate-600">
                    {event.energy.toFixed(2)} eV · {event.nm.toFixed(1)} nm · {event.region}
                    {event.region !== "Visible" && " (invisible to the eye)"}
                  </p>
                  <p className="text-xs text-slate-500">{event.series} series</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">Click an orbit or a number to move the electron. Jumping up absorbs a photon, falling down emits one.</p>
            )}
          </div>

          <div className="rounded-2xl border border-sky-200 bg-white p-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Energy levels (eV)</p>
            <svg viewBox="0 0 260 235" className="h-auto w-full" aria-hidden="true">
              {LEVELS.map((n) => (
                <g key={n}>
                  <line x1="50" x2="200" y1={ladderY(n)} y2={ladderY(n)} stroke={n === level ? "#0284C7" : "#CBD5E1"} strokeWidth={n === level ? 3 : 1.5} />
                  <text x="44" y={ladderY(n) + 3.5} textAnchor="end" fontSize="10" fill="#475569" fontFamily="var(--font-geist-mono)">n={n}</text>
                  <text x="206" y={ladderY(n) + 3.5} fontSize="10" fill="#64748B" fontFamily="var(--font-geist-mono)">{levelEnergy(n).toFixed(2)}</text>
                </g>
              ))}
              {event && (
                <line x1="125" x2="125" y1={ladderY(event.from)} y2={ladderY(event.to)} stroke={event.color ?? "#94A3B8"} strokeWidth="4" strokeDasharray={event.color ? undefined : "4 4"} strokeLinecap="round" />
              )}
              <circle cx="125" cy={ladderY(level)} r="6" fill="#0369A1" />
            </svg>
          </div>

          <ul className="space-y-1.5" aria-label="Challenges">
            {CHALLENGES.map((c) => {
              const ok = done.includes(c.id);
              return (
                <li key={c.id} className={`flex items-center gap-2 text-sm ${ok ? "font-bold text-sky-800" : "text-slate-600"}`}>
                  {ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
                  {c.text}
                </li>
              );
            })}
          </ul>
          {done.length === CHALLENGES.length && (
            <p className="rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900">All challenges complete. You&apos;ve mapped the hydrogen spectrum.</p>
          )}
          <button type="button" onClick={reset} className={ghostBtn}>
            <RotateCcw className="h-4 w-4" />
            Reset atom
          </button>
        </div>
      </div>
    </div>
  );
}
