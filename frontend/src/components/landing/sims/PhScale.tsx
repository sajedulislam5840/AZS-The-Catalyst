"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { SUBSTANCES, guessPoints, hydrogenIon, phColor, phLabel, shuffled } from "@/lib/sim";
import { Readout, ScoreBar, Slider, ghostBtn, primaryBtn } from "./SimUI";

const ROUNDS = 5;
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (n: number) => `${n < 0 ? "⁻" : ""}${String(Math.abs(n)).split("").map((d) => SUP[Number(d)]).join("")}`;

function concentration(ph: number) {
  const { mantissa, exponent } = hydrogenIon(ph);
  return `${mantissa.toFixed(1)} × 10${sup(exponent)} mol/L`;
}

function comparison(ph: number) {
  const times = Math.pow(10, Math.abs(7 - ph));
  const x = times >= 100 ? times.toExponential(0).replace("e+", " × 10^") : times.toFixed(times < 10 ? 1 : 0);
  if (Math.abs(7 - ph) < 0.05) return "Same acidity as pure water.";
  return `${x}× ${ph < 7 ? "more acidic" : "more basic"} than pure water.`;
}

export default function PhScale() {
  const [plays, setPlays] = useState(1);
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState(7);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);

  const picks = useMemo(() => shuffled(SUBSTANCES, plays).slice(0, ROUNDS), [plays]);
  const current = picks[Math.min(round, ROUNDS - 1)];
  const finished = round >= ROUNDS;
  const points = revealed ? guessPoints(guess, current.ph) : 0;

  const check = () => {
    setRevealed(true);
    setScore((s) => s + guessPoints(guess, current.ph));
  };
  const next = () => {
    setRevealed(false);
    setGuess(7);
    setRound((r) => r + 1);
  };
  const again = () => {
    setPlays((p) => p + 1);
    setRound(0);
    setScore(0);
    setRevealed(false);
    setGuess(7);
  };

  return (
    <div className="space-y-5">
      <ScoreBar items={[{ label: "Round", value: `${Math.min(round + 1, ROUNDS)}/${ROUNDS}` }, { label: "Score", value: `${score}/${ROUNDS * 3}` }]} />

      {/* The scale */}
      <div className="rounded-2xl border border-sky-200 bg-white p-4">
        <svg viewBox="0 0 600 90" className="h-auto w-full" role="img" aria-label="pH scale from 0 to 14">
          {Array.from({ length: 15 }, (_, i) => (
            <g key={i}>
              <rect x={30 + i * 36} y="30" width="36" height="22" style={{ fill: phColor(i) }} />
              <text x={48 + i * 36} y="70" textAnchor="middle" fontSize="11" fill="#475569" fontFamily="var(--font-geist-mono)">{i}</text>
            </g>
          ))}
          <text x="30" y="16" fontSize="11" fill="#64748B">Acidic</text>
          <text x="570" y="16" fontSize="11" fill="#64748B" textAnchor="end">Basic</text>
          {!finished && <path d={`M${48 + guess * 36} 28 l-7 -12 h14 z`} fill="#0F172A" />}
          {revealed && <path d={`M${48 + current.ph * 36} 54 l-7 12 h14 z`} fill="#CC310E" />}
        </svg>
      </div>

      {finished ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-6 text-center">
          <p className="text-3xl font-black text-slate-900">{score} / {ROUNDS * 3}</p>
          <p className="mt-1 text-slate-600">
            {score >= 13 ? "Excellent. You have a real feel for pH." : score >= 8 ? "Solid. Review the extremes of the scale and try again." : "Good start. Remember lemon juice is about 2 and bleach is about 12.5."}
          </p>
          <button type="button" onClick={again} className={`${primaryBtn} mx-auto mt-4 max-w-xs`}>
            <RotateCcw className="h-4 w-4" />
            Play again
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Where does this fall on the pH scale?</p>
            <p className="text-3xl font-black tracking-tight text-slate-900">{current.name}</p>
            {revealed && (
              <div role="status" className="rounded-2xl border border-sky-200 bg-white p-4 text-sm">
                <p className="font-extrabold text-slate-900">
                  Actual pH {current.ph} <span className="font-semibold text-slate-500">({phLabel(current.ph)})</span> · you scored {points}/3
                </p>
                <p className="mt-1 text-slate-600">[H⁺] = {concentration(current.ph)}. {comparison(current.ph)}</p>
                <p className="mt-1 text-xs text-slate-500">Each pH step is a 10× change in hydrogen-ion concentration.</p>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <Slider label="Your guess" value={guess} min={0} max={14} step={0.1} unit="" onChange={(v) => !revealed && setGuess(Number(v.toFixed(1)))} tone="chemistry" />
            <div className="grid grid-cols-2 gap-2">
              <Readout label="Guess" value={`pH ${guess.toFixed(1)}`} />
              <Readout label="[H⁺]" value={concentration(guess)} />
            </div>
            {revealed ? (
              <button type="button" onClick={next} className={primaryBtn}>{round + 1 === ROUNDS ? "See results" : "Next substance"}</button>
            ) : (
              <button type="button" onClick={check} className={primaryBtn}>Check answer</button>
            )}
            <button type="button" onClick={again} className={ghostBtn}>
              <RotateCcw className="h-4 w-4" />
              Restart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
