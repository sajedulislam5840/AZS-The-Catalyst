"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Orbit, Play, RotateCcw, Sparkles } from "lucide-react";
import {
  BEAKER_WATER_ML,
  GRAVITY,
  mixPH,
  phColor,
  phLabel,
  positionAt,
  projectile,
  trajectory,
  type Planet,
} from "@/lib/sim";

type Tab = "physics" | "chemistry";

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  tone,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
  tone: "physics" | "chemistry";
}) {
  const id = `sb-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <label htmlFor={id} className="font-semibold text-slate-700">
          {label}
        </label>
        <span className="font-mono text-xs font-bold text-slate-900">
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`h-2 w-full cursor-pointer ${
          tone === "physics" ? "accent-sky-600" : "accent-[#CC310E]"
        }`}
      />
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-sky-100 bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="font-mono text-sm font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

/* ------------------------------ Physics ------------------------------ */

const W = 600;
const H = 300;
const GROUND = 262;
const LEFT = 30;

function PhysicsSandbox() {
  const [speed, setSpeed] = useState(22);
  const [angle, setAngle] = useState(45);
  const [planet, setPlanet] = useState<Planet>("Earth");
  const [t, setT] = useState<number | null>(null);
  const raf = useRef<number | null>(null);

  const g = GRAVITY[planet];
  const result = useMemo(() => projectile(speed, angle, g), [speed, angle, g]);
  const path = useMemo(() => trajectory(speed, angle, g), [speed, angle, g]);

  // Uniform scale so the whole arc always fits the viewbox.
  const scale = Math.min((W - LEFT - 30) / Math.max(result.range, 1), (GROUND - 24) / Math.max(result.maxHeight, 1));
  const px = (x: number) => LEFT + x * scale;
  const py = (y: number) => GROUND - y * scale;
  const d = path.map(([x, y], i) => `${i ? "L" : "M"}${px(x).toFixed(1)} ${py(y).toFixed(1)}`).join(" ");

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const launch = () => {
    stop();
    // Play every flight in 1.2–4 s so the Moon is not boring and short shots are visible.
    const duration = Math.min(4, Math.max(1.2, result.flightTime));
    const rate = result.flightTime / duration;
    const start = performance.now();
    const step = (now: number) => {
      const sim = ((now - start) / 1000) * rate;
      if (sim >= result.flightTime) {
        setT(result.flightTime);
        raf.current = null;
        return;
      }
      setT(sim);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const ball = t === null ? null : positionAt(speed, angle, g, t);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50 to-white">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Projectile trajectory">
          <line x1={LEFT} y1={GROUND} x2={W - 10} y2={GROUND} stroke="#94A3B8" strokeWidth="2" />
          <path d={d} fill="none" stroke="#0284C7" strokeWidth="2" strokeDasharray="6 6" opacity="0.7" />
          {/* launch vector */}
          <line
            x1={LEFT}
            y1={GROUND}
            x2={LEFT + 46 * Math.cos((angle * Math.PI) / 180)}
            y2={GROUND - 46 * Math.sin((angle * Math.PI) / 180)}
            stroke="#075985"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* landing marker */}
          <circle cx={px(result.range)} cy={GROUND} r="4" fill="#CC310E" />
          {ball && <circle cx={px(ball.x)} cy={py(ball.y)} r="9" fill="#CC310E" />}
        </svg>
      </div>

      <div className="space-y-4">
        <Slider label="Launch speed" value={speed} min={5} max={40} unit=" m/s" onChange={setSpeed} tone="physics" />
        <Slider label="Angle" value={angle} min={5} max={85} unit="°" onChange={setAngle} tone="physics" />
        <div>
          <p className="mb-1 text-sm font-semibold text-slate-700">Gravity</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(GRAVITY) as Planet[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlanet(p)}
                aria-pressed={planet === p}
                className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${
                  planet === p
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-sky-200 bg-white text-slate-700 hover:border-sky-400"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Readout label="Range" value={`${result.range.toFixed(1)} m`} />
          <Readout label="Height" value={`${result.maxHeight.toFixed(1)} m`} />
          <Readout label="Time" value={`${result.flightTime.toFixed(2)} s`} />
        </div>
        <button
          type="button"
          onClick={launch}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#CC310E] px-5 py-3 text-sm font-extrabold text-white shadow-[0_10px_30px_-8px_rgba(204,49,14,0.7)] transition hover:bg-[#A8270B] active:scale-95"
        >
          <Play className="h-4 w-4 fill-current" />
          Launch
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- Chemistry ----------------------------- */

function ChemistrySandbox() {
  const [acid, setAcid] = useState(0);
  const [base, setBase] = useState(0);

  const ph = mixPH(acid, base);
  const color = phColor(ph);
  const volume = BEAKER_WATER_ML + acid + base; // 50–150 mL
  const level = 70 + (volume - 50) * 0.9; // liquid height in px
  const reset = () => {
    setAcid(0);
    setBase(0);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="overflow-hidden rounded-2xl border border-[#CC310E]/20 bg-gradient-to-b from-[#FEF3EF] to-white">
        <svg viewBox="0 0 600 300" className="block h-auto w-full" role="img" aria-label={`Beaker with pH ${ph.toFixed(1)}`}>
          <defs>
            <clipPath id="sb-beaker">
              <path d="M230 40 H370 V250 Q370 268 352 268 H248 Q230 268 230 250 Z" />
            </clipPath>
          </defs>
          <g clipPath="url(#sb-beaker)">
            <rect
              x="230"
              y={268 - level}
              width="140"
              height={level}
              style={{ fill: color, transition: "fill 0.45s ease, y 0.35s ease, height 0.35s ease" }}
              opacity="0.9"
            />
          </g>
          <path
            d="M230 40 H370 V250 Q370 268 352 268 H248 Q230 268 230 250 Z"
            fill="none"
            stroke="#075985"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* pH scale */}
          {Array.from({ length: 15 }, (_, i) => (
            <g key={i}>
              <rect x={60 + i * 32} y="284" width="32" height="10" style={{ fill: phColor(i) }} />
              {i % 2 === 0 && (
                <text x={76 + i * 32} y="280" textAnchor="middle" fontSize="10" fill="#475569" fontFamily="var(--font-geist-mono)">
                  {i}
                </text>
              )}
            </g>
          ))}
          <path
            d={`M${76 + ph * 32} 270 l-6 -9 h12 z`}
            fill="#0F172A"
            style={{ transition: "d 0.35s ease" }}
          />
        </svg>
      </div>

      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-slate-600">
          {BEAKER_WATER_ML} mL of water. Add 0.1 M hydrochloric acid and 0.1 M sodium hydroxide.
        </p>
        <Slider label="Add HCl (acid)" value={acid} min={0} max={50} unit=" mL" onChange={setAcid} tone="chemistry" />
        <Slider label="Add NaOH (base)" value={base} min={0} max={50} unit=" mL" onChange={setBase} tone="chemistry" />
        <div className="grid grid-cols-2 gap-2">
          <Readout label="pH" value={ph.toFixed(2)} />
          <Readout label="Solution" value={phLabel(ph)} />
        </div>
        <p className="text-xs text-slate-500">Tip: add equal volumes of both and watch the pH land on 7.</p>
        <button
          type="button"
          onClick={reset}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[#CC310E]/40 bg-white px-5 py-3 text-sm font-bold text-[#CC310E] transition hover:bg-[#FEF3EF] active:scale-95"
        >
          <RotateCcw className="h-4 w-4" />
          Reset beaker
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Section ------------------------------ */

export default function Sandbox() {
  const [tab, setTab] = useState<Tab>("physics");

  return (
    <section id="sandbox" className="scroll-mt-20 bg-[#F3F8FC] px-4 pb-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#CC310E]">Free sandbox</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Try it now. No account needed.
          </h2>
          <p className="mt-3 text-slate-600">Throw a projectile or neutralise an acid. Change a number, see what happens.</p>
        </div>

        <div className="rounded-3xl border border-sky-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-6">
          <div role="tablist" aria-label="Sandbox subject" className="mx-auto mb-6 grid max-w-sm grid-cols-2 rounded-full bg-sky-100 p-1">
            {(
              [
                ["physics", "Physics", Orbit],
                ["chemistry", "Chemistry", FlaskConical],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className="relative rounded-full px-4 py-2 text-sm font-bold"
              >
                {tab === id && (
                  <motion.span
                    layoutId="sandbox-tab"
                    className={`absolute inset-0 rounded-full shadow ${id === "physics" ? "bg-sky-600" : "bg-[#CC310E]"}`}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className={`relative flex items-center justify-center gap-2 ${tab === id ? "text-white" : "text-slate-600"}`}>
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
              </button>
            ))}
          </div>

          {tab === "physics" ? <PhysicsSandbox /> : <ChemistrySandbox />}
        </div>

        {/* Conversion prompt */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#CC310E]/20 bg-[#FEF3EF] px-6 py-5 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <Sparkles className="hidden h-6 w-6 shrink-0 text-[#CC310E] sm:block" />
            <p className="font-bold text-slate-900">
              Want to save your lab notebook progress? Create your free account.
            </p>
          </div>
          <Link
            href="/register"
            className="shrink-0 rounded-full bg-[#CC310E] px-6 py-3 text-sm font-extrabold text-white shadow-[0_10px_30px_-8px_rgba(204,49,14,0.7)] transition hover:bg-[#A8270B] active:scale-95"
          >
            Create free account
          </Link>
        </div>
      </div>
    </section>
  );
}
