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
