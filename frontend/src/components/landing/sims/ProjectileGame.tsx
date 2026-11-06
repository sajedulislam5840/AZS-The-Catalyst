"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Target } from "lucide-react";
import {
  GRAVITY,
  MAX_LAUNCH_SPEED,
  hitPoints,
  positionAt,
  projectile,
  targetDistance,
  targetTolerance,
  trajectory,
  type Planet,
} from "@/lib/sim";
import { Readout, ScoreBar, Slider, ghostBtn, primaryBtn } from "./SimUI";

const W = 600;
const H = 300;
const GROUND = 262;
const LEFT = 30;

type Feedback = { kind: "idle" | "hit" | "miss"; text: string };

export default function ProjectileGame() {
  const [planet, setPlanet] = useState<Planet>("Earth");
  const [level, setLevel] = useState(1);
  const [speed, setSpeed] = useState(25);
  const [angle, setAngle] = useState(40);
  const [ballShown, setBallShown] = useState(false);
  const ballRef = useRef<SVGCircleElement>(null);
  const [flying, setFlying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(false);
  const [lastShot, setLastShot] = useState<{ speed: number; angle: number } | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({
    kind: "idle",
    text: "Set speed and angle, then fire at the target.",
  });
  const raf = useRef<number | null>(null);

  const g = GRAVITY[planet];
  const target = targetDistance(level, g);
  const tol = targetTolerance(target);
  const xMax = target * 1.35;
  const scale = (W - LEFT - 20) / xMax;
  const px = (x: number) => LEFT + x * scale;
  const py = (y: number) => GROUND - y * scale;

  useEffect(
    () => () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    },
    [],
  );

  const resetRound = (nextLevel: number) => {
    setLevel(nextLevel);
    setAttempts(0);
    setSolved(false);
    setBallShown(false);
    setLastShot(null);
    setFeedback({ kind: "idle", text: "New target. Set speed and angle, then fire." });
  };

  const changePlanet = (p: Planet) => {
    setPlanet(p);
    setAttempts(0);
    setSolved(false);
    setBallShown(false);
    setLastShot(null);
    setFeedback({ kind: "idle", text: `Gravity is now ${GRAVITY[p]} m/s². The target moved, so aim again.` });
  };

  // Updates the ball directly on the DOM node: 60 fps without re-rendering React.
  const moveBall = (v: number, a: number, time: number) => {
    const p = positionAt(v, a, g, time);
    ballRef.current?.setAttribute("cx", String(px(p.x)));
    ballRef.current?.setAttribute("cy", String(py(p.y)));
  };

  const fire = () => {
    if (flying || solved) return;
    const result = projectile(speed, angle, g);
    const shotAttempts = attempts + 1;
    setAttempts(shotAttempts);
    setFlying(true);
    setBallShown(true);
    setLastShot({ speed, angle });
    const duration = Math.min(3.5, Math.max(1.2, result.flightTime));
    const rate = result.flightTime / duration;
    const start = performance.now();
    const step = (now: number) => {
      const sim = ((now - start) / 1000) * rate;
      if (sim >= result.flightTime) {
        moveBall(speed, angle, result.flightTime);
        setFlying(false);
        raf.current = null;
        const miss = result.range - target;
        if (Math.abs(miss) <= tol) {
          const pts = hitPoints(shotAttempts);
          setScore((s) => s + pts);
          setSolved(true);
          setFeedback({ kind: "hit", text: `Direct hit! +${pts} point${pts > 1 ? "s" : ""}.` });
        } else {
          setFeedback({
            kind: "miss",
            text: `${miss < 0 ? "Too short" : "Too far"} by ${Math.abs(miss).toFixed(1)} m. Adjust and try again.`,
          });
        }
        return;
      }
      moveBall(speed, angle, sim);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const ghost = lastShot
    ? trajectory(lastShot.speed, lastShot.angle, g)
        .map(([x, y], i) => `${i ? "L" : "M"}${px(x).toFixed(1)} ${py(y).toFixed(1)}`)
        .join(" ")
    : null;
  const preview = projectile(speed, angle, g);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ScoreBar items={[{ label: "Level", value: level }, { label: "Shots", value: attempts }, { label: "Score", value: score }]} />
        <div className="flex gap-2" role="group" aria-label="Gravity">
          {(Object.keys(GRAVITY) as Planet[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => changePlanet(p)}
              disabled={flying}
              aria-pressed={planet === p}
              className={`rounded-lg border px-3.5 py-2.5 text-xs font-bold transition ${
                planet === p ? "border-sky-600 bg-sky-600 text-white" : "border-sky-200 bg-white text-slate-700 hover:border-sky-400"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <div className="overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50 to-white">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Target ${target} metres away`}>
            <line x1={LEFT} y1={GROUND} x2={W - 6} y2={GROUND} stroke="#94A3B8" strokeWidth="2" />
            {/* target zone */}
            <rect x={px(target - tol)} y={GROUND - 6} width={Math.max(6, 2 * tol * scale)} height="6" fill="#CC310E" opacity="0.9" />
            <line x1={px(target)} y1={GROUND - 6} x2={px(target)} y2={GROUND - 34} stroke="#CC310E" strokeWidth="2" />
            <polygon points={`${px(target)},${GROUND - 34} ${px(target) + 18},${GROUND - 28} ${px(target)},${GROUND - 22}`} fill="#CC310E" />
            <text x={px(target)} y={GROUND + 20} textAnchor="middle" fontSize="12" fill="#475569" fontFamily="var(--font-geist-mono)">
              {target} m
            </text>
            {ghost && <path d={ghost} fill="none" stroke="#0284C7" strokeWidth="2" strokeDasharray="5 6" opacity="0.45" />}
            {/* cannon */}
            <line
              x1={LEFT}
              y1={GROUND}
              x2={LEFT + 38 * Math.cos((angle * Math.PI) / 180)}
              y2={GROUND - 38 * Math.sin((angle * Math.PI) / 180)}
              stroke="#075985"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle cx={LEFT} cy={GROUND} r="9" fill="#075985" />
            {ballShown && <circle ref={ballRef} cx={LEFT} cy={GROUND} r="8" fill="#CC310E" />}
          </svg>
        </div>

        <div className="space-y-4">
          <Slider label="Launch speed" value={speed} min={5} max={MAX_LAUNCH_SPEED} unit=" m/s" onChange={setSpeed} tone="physics" disabled={flying} />
          <Slider label="Angle" value={angle} min={5} max={85} unit="°" onChange={setAngle} tone="physics" disabled={flying} />
          <div className="grid grid-cols-2 gap-2">
            <Readout label="Target" value={`${target} m`} />
            <Readout label="Gravity" value={`${g} m/s²`} />
          </div>
          <p className="text-xs text-slate-500">
            Hint: range = v² sin 2θ / g. At {speed} m/s and {angle}° your shot would land near {preview.range.toFixed(0)} m.
          </p>
          <div
            role="status"
            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
              feedback.kind === "hit"
                ? "border-sky-300 bg-sky-50 text-sky-900"
                : feedback.kind === "miss"
                  ? "border-[#CC310E]/30 bg-[#FEF3EF] text-[#A8270B]"
                  : "border-sky-100 bg-white text-slate-600"
            }`}
          >
            {feedback.text}
          </div>
          {solved ? (
            <button type="button" onClick={() => resetRound(level + 1)} className={primaryBtn}>
              <Target className="h-4 w-4" />
              Next target
            </button>
          ) : (
            <button type="button" onClick={fire} disabled={flying} className={primaryBtn}>
              <Play className="h-4 w-4 fill-current" />
              Fire
            </button>
          )}
          <button type="button" onClick={() => { setScore(0); resetRound(1); }} className={ghostBtn}>
            <RotateCcw className="h-4 w-4" />
            Restart game
          </button>
        </div>
      </div>
    </div>
  );
}
