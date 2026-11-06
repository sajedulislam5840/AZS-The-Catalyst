/** Hydrogen (Bohr model) energy levels and spectral lines. Pure maths, no React. */

export const MAX_LEVEL = 6;
const RYDBERG_EV = 13.605693;
const HC_EV_NM = 1239.84198;

/** Energy of level n in eV (negative = bound). */
export const levelEnergy = (n: number) => -RYDBERG_EV / (n * n);

/** Energy (eV) of a photon absorbed or emitted in a transition. */
export const transitionEnergy = (from: number, to: number) =>
  Math.abs(levelEnergy(from) - levelEnergy(to));

/** Photon wavelength (nm) for a transition. */
export const wavelengthNm = (from: number, to: number) =>
  HC_EV_NM / transitionEnergy(from, to);

export type Region = "Ultraviolet" | "Visible" | "Infrared";
export const spectralRegion = (nm: number): Region =>
  nm < 380 ? "Ultraviolet" : nm > 780 ? "Infrared" : "Visible";

/** Spectral series is named by the lower level of the transition. */
export function seriesName(from: number, to: number): string {
  const names = ["Lyman", "Balmer", "Paschen", "Brackett", "Pfund"];
  return names[Math.min(from, to) - 1] ?? "Humphreys";
}

/** Approximate display colour for a visible wavelength; null outside 380–780 nm. */
export function wavelengthToColor(nm: number): string | null {
  if (nm < 380 || nm > 780) return null;
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else { r = 1; }
  const f = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 700 ? 0.3 + (0.7 * (780 - nm)) / 80 : 1;
  const c = (v: number) => Math.round(255 * Math.pow(Math.max(0, v) * f, 0.8));
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}

export interface Transition {
  type: "absorb" | "emit";
  from: number;
  to: number;
}

export const CHALLENGES: readonly { id: string; text: string; done: (t: Transition) => boolean }[] = [
  { id: "halpha", text: "Emit the red H-alpha line (3 → 2)", done: (t) => t.type === "emit" && t.from === 3 && t.to === 2 },
  { id: "uv", text: "Emit an ultraviolet photon (fall to level 1)", done: (t) => t.type === "emit" && t.to === 1 },
  { id: "violet", text: "Emit a violet line (6 → 2)", done: (t) => t.type === "emit" && t.from === 6 && t.to === 2 },
  { id: "absorb", text: "Absorb a photon to jump from 1 to 3", done: (t) => t.type === "absorb" && t.from === 1 && t.to === 3 },
];
