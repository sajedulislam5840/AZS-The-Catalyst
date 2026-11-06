/**
 * Shared colour cycle for glowing icons.
 *
 * One timer for the whole app (not one per icon): every `GLOW_INTERVAL_MS` the tick
 * advances and every subscribed icon moves to its next palette colour. Icons use an
 * `offset` so neighbours show different colours at the same moment.
 */

export const GLOW_INTERVAL_MS = 15_000;

export const GLOW_PALETTE = [
  "#0EA5E9", // sky
  "#CC310E", // ember
  "#F59E0B", // amber
  "#14B8A6", // teal
  "#8B5CF6", // violet
] as const;

/** Colour for a tick and offset; wraps around the palette and tolerates negatives. */
export function glowColor(tick: number, offset = 0): string {
  const n = GLOW_PALETTE.length;
  return GLOW_PALETTE[(((tick + offset) % n) + n) % n];
}

let tick = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function advance() {
  // Save battery: no colour changes while the tab is in the background.
  if (typeof document !== "undefined" && document.hidden) return;
  tick += 1;
  listeners.forEach((l) => l());
}

/** useSyncExternalStore subscribe: the timer runs only while something is listening. */
export function subscribeGlow(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) timer = setInterval(advance, GLOW_INTERVAL_MS);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export const getGlowTick = () => tick;
export const getServerGlowTick = () => 0;
