"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { shuffled } from "@/lib/sim";
import { domains, quizQuestion, shapeFor, validLonePairs } from "@/lib/sim-vsepr";
import { ScoreBar, ghostBtn, primaryBtn } from "./SimUI";

const SIZE = 300;
const R = 100;

function useAngle() {
  const [angle, setAngle] = useState(0.6);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let id = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      acc += now - last;
      last = now;
      if (acc >= 33) {
        // ~30 fps is plenty for a slow turntable and halves the work on phones
        setAngle((a) => a + (acc / 1000) * 0.7);
        acc = 0;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return angle;
}

function Molecule({ bonded, lone, spin }: { bonded: number; lone: number; spin: number }) {
  const items = useMemo(() => domains(bonded, lone), [bonded, lone]);
  const tilt = 0.35;
  const placed = items
    .map((d) => {
      const [x, y, z] = d.vec;
      const x1 = x * Math.cos(spin) + z * Math.sin(spin);
      const z1 = -x * Math.sin(spin) + z * Math.cos(spin);
      const y2 = y * Math.cos(tilt) - z1 * Math.sin(tilt);
      const z2 = y * Math.sin(tilt) + z1 * Math.cos(tilt);
      const k = 1 / (1 - z2 * 0.16);
      return { kind: d.kind, x: SIZE / 2 + x1 * R * k, y: SIZE / 2 - y2 * R * k, z: z2, k };
    })
    .sort((a, b) => a.z - b.z);

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block h-auto w-full max-w-sm" role="img" aria-label={`${bonded} bonded atoms and ${lone} lone pairs`}>
      {placed.map((p, i) =>
        p.kind === "bond" ? (
          <line key={`l${i}`} x1={SIZE / 2} y1={SIZE / 2} x2={p.x} y2={p.y} stroke="#075985" strokeWidth={4 * p.k} strokeLinecap="round" opacity={0.35 + 0.4 * p.k} />
        ) : null,
      )}
      {placed.map((p, i) =>
        p.kind === "bond" ? (
          <circle key={`a${i}`} cx={p.x} cy={p.y} r={13 * p.k} fill="#CC310E" stroke="white" strokeWidth="2" />
        ) : (
          <g key={`p${i}`} opacity={0.5 + 0.4 * p.k}>
            <ellipse cx={SIZE / 2 + (p.x - SIZE / 2) * 0.62} cy={SIZE / 2 + (p.y - SIZE / 2) * 0.62} rx={20 * p.k} ry={13 * p.k} fill="#7DD3FC" stroke="#0284C7" strokeDasharray="3 3" />
            <circle cx={SIZE / 2 + (p.x - SIZE / 2) * 0.62 - 5} cy={SIZE / 2 + (p.y - SIZE / 2) * 0.62} r="2.5" fill="#075985" />
            <circle cx={SIZE / 2 + (p.x - SIZE / 2) * 0.62 + 5} cy={SIZE / 2 + (p.y - SIZE / 2) * 0.62} r="2.5" fill="#075985" />
          </g>
        ),
      )}
      <circle cx={SIZE / 2} cy={SIZE / 2} r="17" fill="#0369A1" stroke="white" strokeWidth="2" />
      <text x={SIZE / 2} y={SIZE / 2 + 4} textAnchor="middle" fontSize="12" fontWeight="800" fill="white">A</text>
    </svg>
  );
}

export default function MoleculeShapes() {
  const [mode, setMode] = useState<"explore" | "quiz">("explore");
  const [steric, setSteric] = useState(4);
  const [lone, setLone] = useState(0);
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const spin = useAngle();

  const question = useMemo(() => quizQuestion(round, shuffled), [round]);
  const shape = mode === "quiz" ? question.shape : shapeFor(steric - lone, lone);
  const bonded = shape?.bonded ?? 4;
  const lp = shape?.lone ?? 0;

  const chooseSteric = (s: number) => {
    setSteric(s);
    const valid = validLonePairs(s);
    if (!valid.includes(lone)) setLone(valid[valid.length - 1]);
  };

  const answer = (name: string) => {
    if (picked) return;
    setPicked(name);
    setAnswered((a) => a + 1);
    if (name === question.shape.name) setScore((s) => s + 1);
  };

  const switchMode = (m: "explore" | "quiz") => {
    setMode(m);
    setPicked(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Mode" className="grid grid-cols-2 rounded-full bg-sky-100 p-1 text-sm font-bold">
          {(["explore", "quiz"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`rounded-full px-5 py-2.5 capitalize transition ${mode === m ? "bg-sky-600 text-white" : "text-slate-600"}`}
            >
              {m}
            </button>
          ))}
        </div>
        {mode === "quiz" && <ScoreBar items={[{ label: "Correct", value: `${score}/${answered}` }]} />}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50 to-white p-3">
          <Molecule bonded={bonded} lone={lp} spin={spin} />
          <p className="text-center text-xs text-slate-500">
            <span className="font-bold text-[#CC310E]">●</span> bonded atom &nbsp; <span className="font-bold text-sky-500">◖</span> lone pair
          </p>
        </div>

        <div className="space-y-4">
          {mode === "explore" ? (
            <>
              <div>
                <p className="mb-1.5 text-sm font-semibold text-slate-700">Electron domains around the central atom</p>
                <div className="grid grid-cols-5 gap-2">
                  {[2, 3, 4, 5, 6].map((s) => (
                    <button key={s} type="button" onClick={() => chooseSteric(s)} aria-pressed={steric === s}
                      className={`rounded-lg border py-3 text-sm font-extrabold transition ${steric === s ? "border-sky-600 bg-sky-600 text-white" : "border-sky-200 bg-white text-slate-700 hover:border-sky-400"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-sm font-semibold text-slate-700">Lone pairs</p>
                <div className="flex gap-2">
                  {validLonePairs(steric).map((n) => (
                    <button key={n} type="button" onClick={() => setLone(n)} aria-pressed={lone === n}
                      className={`h-11 w-11 rounded-lg border text-sm font-extrabold transition ${lone === n ? "border-[#CC310E] bg-[#CC310E] text-white" : "border-sky-200 bg-white text-slate-700 hover:border-[#CC310E]/50"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {shape && (
                <div role="status" className="rounded-2xl border border-sky-200 bg-white p-4">
                  <p className="text-xl font-black text-slate-900">{shape.name}</p>
                  <p className="mt-1 text-sm text-slate-600">Bond angles: {shape.angles}</p>
                  <p className="text-sm text-slate-600">Example: <span className="font-bold text-slate-900">{shape.example}</span></p>
                  {shape.lone > 0 && <p className="mt-2 text-xs text-slate-500">Lone pairs push harder than bonding pairs, so angles shrink.</p>}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-sky-200 bg-white p-4">
                <p className="text-sm text-slate-600">
                  <span className="font-extrabold text-slate-900">{question.shape.bonded}</span> bonded atoms and{" "}
                  <span className="font-extrabold text-slate-900">{question.shape.lone}</span> lone pair{question.shape.lone === 1 ? "" : "s"}. What is the shape?
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Answers">
                {question.options.map((o) => {
                  const correct = picked && o === question.shape.name;
                  const wrong = picked === o && o !== question.shape.name;
                  return (
                    <button key={o} type="button" onClick={() => answer(o)} disabled={!!picked}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left text-sm font-bold transition ${
                        correct ? "border-sky-500 bg-sky-50 text-sky-900" : wrong ? "border-[#CC310E] bg-[#FEF3EF] text-[#A8270B]" : "border-sky-200 bg-white text-slate-700 hover:border-sky-400"
                      }`}>
                      {o}
                      {correct && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                      {wrong && <XCircle className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {picked && (
                <>
                  <p role="status" className="text-sm text-slate-600">
                    {picked === question.shape.name ? "Correct. " : `It's ${question.shape.name}. `}
                    Example: {question.shape.example}, angles {question.shape.angles}.
                  </p>
                  <button type="button" onClick={() => { setPicked(null); setRound((r) => r + 1); }} className={primaryBtn}>Next question</button>
                </>
              )}
              <button type="button" onClick={() => { setRound(0); setPicked(null); setScore(0); setAnswered(0); }} className={ghostBtn}>
                <RotateCcw className="h-4 w-4" />
                Restart quiz
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
