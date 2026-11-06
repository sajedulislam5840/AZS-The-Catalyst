"use client";

import { useEffect, useRef } from "react";

/**
 * A number that counts up to its value. The text is updated directly on the element so a
 * 700 ms animation does not re-render the page 40 times.
 */
export default function CountUp({ value, suffix = "", className = "" }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = from.current;
    if (reduce || start === value) {
      el.textContent = `${value}${suffix}`;
      from.current = value;
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 700);
      const eased = 1 - (1 - p) ** 3;
      el.textContent = `${Math.round(start + (value - start) * eased)}${suffix}`;
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = Number(el.textContent?.replace(suffix, "")) || value;
    };
  }, [value, suffix]);

  return (
    <span ref={ref} className={className}>
      {value}
      {suffix}
    </span>
  );
}
