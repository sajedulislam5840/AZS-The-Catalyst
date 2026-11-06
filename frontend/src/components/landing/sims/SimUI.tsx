"use client";

import type { CSSProperties } from "react";

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  tone,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
  tone: "physics" | "chemistry";
  disabled?: boolean;
}) {
  const id = `sb-${label.replace(/\W+/g, "-").toLowerCase()}`;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-0.5 flex items-baseline justify-between text-sm">
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
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`azs-range ${tone === "physics" ? "[--range-color:#0284C7]" : "[--range-color:#CC310E]"}`}
        style={{ "--pct": `${pct}%` } as CSSProperties}
      />
    </div>
  );
}

export function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-sky-100 bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="font-mono text-sm font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

export function ScoreBar({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <div key={i.label} className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs">
          <span className="font-semibold text-slate-500">{i.label} </span>
          <span className="font-mono font-extrabold text-slate-900">{i.value}</span>
        </div>
      ))}
    </div>
  );
}

export const primaryBtn =
  "flex w-full items-center justify-center gap-2 rounded-full bg-[#CC310E] px-5 py-3 text-sm font-extrabold text-white shadow-[0_10px_30px_-8px_rgba(204,49,14,0.7)] transition hover:bg-[#A8270B] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60";
export const ghostBtn =
  "flex w-full items-center justify-center gap-2 rounded-full border border-sky-300 bg-white px-5 py-3 text-sm font-bold text-sky-900 transition hover:border-sky-500 active:scale-95";
