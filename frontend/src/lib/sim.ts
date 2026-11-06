/** Pure simulation maths for the landing-page sandbox (no React, easy to test). */

export const GRAVITY = {
  Earth: 9.81,
  Mars: 3.71,
  Moon: 1.62,
} as const;
export type Planet = keyof typeof GRAVITY;

export interface ProjectileResult {
  /** Horizontal distance travelled until landing (m). */
  range: number;
  /** Peak height above the ground (m). */
  maxHeight: number;
  /** Total time of flight (s). */
  flightTime: number;
}

/** Projectile launched from ground level, no air resistance. */
export function projectile(speed: number, angleDeg: number, g: number): ProjectileResult {
  const a = (angleDeg * Math.PI) / 180;
  const vx = speed * Math.cos(a);
  const vy = speed * Math.sin(a);
  const flightTime = (2 * vy) / g;
  return {
    range: vx * flightTime,
    maxHeight: (vy * vy) / (2 * g),
    flightTime,
  };
}

/** Position (metres) at time t, clamped to the flight. */
export function positionAt(speed: number, angleDeg: number, g: number, t: number) {
  const a = (angleDeg * Math.PI) / 180;
  const T = projectile(speed, angleDeg, g).flightTime;
  const tt = Math.min(Math.max(t, 0), T);
  return {
    x: speed * Math.cos(a) * tt,
    y: Math.max(0, speed * Math.sin(a) * tt - 0.5 * g * tt * tt),
  };
}

/** Sample the trajectory as [x, y] metres. */
export function trajectory(speed: number, angleDeg: number, g: number, samples = 48) {
  const T = projectile(speed, angleDeg, g).flightTime;
  const pts: [number, number][] = [];
  for (let i = 0; i <= samples; i++) {
    const p = positionAt(speed, angleDeg, g, (T * i) / samples);
    pts.push([p.x, p.y]);
  }
  return pts;
}

/* ---------------- Chemistry: strong acid + strong base ---------------- */

export const BEAKER_WATER_ML = 50;
export const CONCENTRATION_M = 0.1; // HCl and NaOH are both 0.1 M
const KW = 1e-14;

/**
 * pH after adding `acidMl` of 0.1 M HCl and `baseMl` of 0.1 M NaOH to 50 mL water.
 * Strong acid/base, with water auto-ionisation so a perfect neutralisation gives pH 7.
 */
export function mixPH(acidMl: number, baseMl: number): number {
  const totalL = (BEAKER_WATER_ML + acidMl + baseMl) / 1000;
  const excessMol = ((acidMl - baseMl) / 1000) * CONCENTRATION_M; // + = acid excess
  const c = excessMol / totalL;
  const h = (c + Math.sqrt(c * c + 4 * KW)) / 2; // [H+]
  return -Math.log10(h);
}

/** Universal-indicator style colours for pH 0..14. */
const INDICATOR = [
  "#E11D48", "#EF4444", "#F97316", "#FB923C", "#FACC15", "#BEF264", "#84CC16",
  "#22C55E", "#14B8A6", "#0EA5E9", "#3B82F6", "#6366F1", "#7C3AED", "#6D28D9", "#4C1D95",
] as const;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function phColor(ph: number): string {
  const clamped = Math.min(14, Math.max(0, ph));
  const i = Math.min(13, Math.floor(clamped));
  const f = clamped - i;
  const a = hexToRgb(INDICATOR[i]);
  const b = hexToRgb(INDICATOR[i + 1]);
  const rgb = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export function phLabel(ph: number): "Acidic" | "Neutral" | "Basic" {
  if (ph < 6.5) return "Acidic";
  if (ph > 7.5) return "Basic";
  return "Neutral";
}

/* ---------------- Shared helpers for the games ---------------- */

/** Deterministic value in [0, 1) from an integer seed (keeps game logic pure and testable). */
export function rand01(seed: number): number {
  let a = (seed * 2654435761) | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Fisher–Yates shuffle driven by a seed. Does not mutate the input. */
export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand01(seed * 1009 + i) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ---------------- Projectile target practice ---------------- */

export const MAX_LAUNCH_SPEED = 40;

/** Target distance (m) for a level: 20%–85% of the best possible range on that planet. */
export function targetDistance(level: number, g: number): number {
  const maxRange = (MAX_LAUNCH_SPEED * MAX_LAUNCH_SPEED) / g;
  return Math.round(maxRange * (0.2 + 0.65 * rand01(level * 7919 + 13)));
}

export function targetTolerance(distance: number): number {
  return Math.max(2, distance * 0.04);
}

/** Points for a hit: 3 on the first try, 2 on the second, then 1. */
export function hitPoints(attemptsThisLevel: number): number {
  return Math.max(1, 4 - attemptsThisLevel);
}

/* ---------------- pH scale game ---------------- */

export interface Substance {
  name: string;
  ph: number;
}

export const SUBSTANCES: readonly Substance[] = [
  { name: "Stomach acid", ph: 1.5 },
  { name: "Lemon juice", ph: 2.0 },
  { name: "Vinegar", ph: 2.9 },
  { name: "Orange juice", ph: 3.5 },
  { name: "Tomato juice", ph: 4.5 },
  { name: "Black coffee", ph: 5.0 },
  { name: "Milk", ph: 6.5 },
  { name: "Pure water", ph: 7.0 },
  { name: "Human blood", ph: 7.4 },
  { name: "Seawater", ph: 8.1 },
  { name: "Baking soda solution", ph: 8.3 },
  { name: "Hand soap", ph: 10.0 },
  { name: "Milk of magnesia", ph: 10.5 },
  { name: "Household ammonia", ph: 11.5 },
  { name: "Bleach", ph: 12.5 },
  { name: "Drain cleaner", ph: 13.5 },
];

/** Points for a pH guess: 3 within 0.5, 2 within 1, 1 within 2, else 0. */
export function guessPoints(guess: number, actual: number): number {
  const d = Math.abs(guess - actual);
  if (d <= 0.5) return 3;
  if (d <= 1) return 2;
  if (d <= 2) return 1;
  return 0;
}

/** Hydrogen-ion concentration split into mantissa × 10^exponent (mol/L). */
export function hydrogenIon(ph: number): { mantissa: number; exponent: number } {
  const exponent = -Math.ceil(ph);
  return { mantissa: Math.pow(10, -ph - exponent), exponent };
}
