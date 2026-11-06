"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// three + r3f are heavy: keep them out of the initial bundle and the server render.
const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

type Mode = "canvas" | "css";

let webglSupported: boolean | null = null;
function hasWebGL() {
  if (webglSupported === null) {
    try {
      const c = document.createElement("canvas");
      webglSupported = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webglSupported = false;
    }
  }
  return webglSupported;
}

function subscribe(onChange: () => void) {
  const queries = [
    window.matchMedia("(prefers-reduced-motion: reduce)"),
    window.matchMedia("(min-width: 768px)"),
  ];
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}

function getSnapshot(): Mode {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "css";
  if (!window.matchMedia("(min-width: 768px)").matches) return "css";
  const nav = navigator as Navigator & { deviceMemory?: number };
  if ((nav.hardwareConcurrency ?? 8) < 4) return "css";
  if ((nav.deviceMemory ?? 8) < 4) return "css";
  return hasWebGL() ? "canvas" : "css";
}

const getServerSnapshot = (): Mode => "css";

// Fixed positions so server and client markup match.
const DOTS = [
  [8, 22, 0], [16, 64, 1], [27, 38, 2], [34, 80, 0], [12, 48, 2],
  [62, 28, 1], [71, 70, 0], [84, 40, 2], [92, 18, 1], [78, 84, 0],
  [45, 14, 2], [55, 88, 1],
] as const;

export default function HeroBackdrop() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(true);
  const root = useRef<HTMLDivElement>(null);

  // Mount the canvas shortly after first paint so text and CTAs appear first.
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 500);
    return () => window.clearTimeout(id);
  }, []);

  // Stop rendering when the hero is scrolled out of view.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const showCanvas = mode === "canvas" && ready;

  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Lightweight base layer: always present, the only layer on weak devices. */}
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl azs-drift" />
      <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-[#CC310E]/15 blur-3xl azs-drift [animation-delay:-3s]" />
      {!showCanvas &&
        DOTS.map(([x, y, d], i) => (
          <span
            key={i}
            className={`absolute h-1.5 w-1.5 rounded-full azs-drift ${
              x < 50 ? "bg-sky-500/60" : "bg-[#CC310E]/50"
            }`}
            style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${-d * 2}s` }}
          />
        ))}

      {showCanvas && (
        <div className="absolute inset-0 animate-[fadeIn_1s_ease-out_both]">
          <HeroCanvas active={inView} />
        </div>
      )}
    </div>
  );
}
