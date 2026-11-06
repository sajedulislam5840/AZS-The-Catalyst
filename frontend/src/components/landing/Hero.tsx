"use client";

import { motion } from "framer-motion";
import { ArrowRight, FlaskConical, Orbit, Play, Gamepad2 } from "lucide-react";
import { FlaskAccent, TrajectoryOverlay } from "./HeroAccents";
import GlowIcon from "@/components/ui/GlowIcon";
import HeroBackdrop from "./HeroBackdrop";

interface DomainCardProps {
  title: string;
  text: string;
  cta: string;
  href: string;
  tone: "physics" | "chemistry";
}

function DomainCard({ title, text, cta, href, tone }: DomainCardProps) {
  const physics = tone === "physics";
  const Icon = physics ? Orbit : FlaskConical;
  return (
    <motion.a
      href={href}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative block overflow-hidden rounded-2xl border bg-white/85 p-5 text-left shadow-sm md:bg-white/70 md:backdrop-blur-md transition-colors ${
        physics
          ? "border-sky-300/70 hover:border-sky-500"
          : "border-[#CC310E]/25 hover:border-[#CC310E]/60"
      }`}
    >
      <GlowIcon icon={Icon} offset={physics ? 0 : 1} className="mb-3" />
      <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
      <span
        className={`mt-4 inline-flex items-center gap-1.5 text-sm font-bold ${
          physics ? "text-sky-700" : "text-[#CC310E]"
        }`}
      >
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </motion.a>
  );
}

export default function Hero() {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-[#F3F8FC] pt-24 sm:pt-28">
      {/* Layer 0: vector grid, colour blend, particles/3D */}
      <div aria-hidden="true" className="azs-vector-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(125,211,252,0.45),rgba(243,248,252,0)_42%,rgba(243,248,252,0)_58%,rgba(250,195,176,0.5))]"
      />
      <HeroBackdrop />

      {/* Layer 1: content */}
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 sm:px-6">
        <div className="relative w-full">
          {/* Side accents (desktop only) */}
          <div className="absolute left-0 top-10 hidden lg:block">
            <TrajectoryOverlay />
          </div>
          <div className="absolute right-0 top-14 hidden lg:block">
            <FlaskAccent />
          </div>

          {/* Soft scrim keeps the headline readable over the colour blend */}
          <div className="relative mx-auto max-w-2xl text-center">
            <div
              aria-hidden="true"
              className="absolute -inset-x-6 -inset-y-8 -z-10 rounded-[3rem] bg-white/60 blur-xl md:blur-2xl"
            />
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#CC310E]" />
              Physics · Chemistry · AI tutor
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="text-4xl font-black leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
            >
              Master{" "}
              <span className="bg-gradient-to-r from-sky-600 to-sky-400 bg-clip-text text-transparent">
                Physics
              </span>{" "}
              &amp;{" "}
              <span className="bg-gradient-to-r from-[#CC310E] to-[#F2711C] bg-clip-text text-transparent">
                Chemistry
              </span>{" "}
              Through Live Interaction
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg"
            >
              Stop memorizing formulas from flat pages. Experience real-time orbits,
              molecular bonds, and lab simulations straight in your browser.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
            >
              <a
                href="#simulations"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#CC310E] px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_10px_30px_-8px_rgba(204,49,14,0.7)] transition hover:bg-[#A8270B] active:scale-95"
              >
                <Play className="h-4 w-4 fill-current" />
                Launch Simulation
              </a>
              <a
                href="#sandbox"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-300 bg-white/80 px-6 py-3.5 text-sm font-bold text-sky-900 md:backdrop-blur-md transition hover:border-sky-500 hover:bg-white active:scale-95"
              >
                <Gamepad2 className="h-4 w-4" />
                Try Free Sandbox
              </a>
            </motion.div>
          </div>
        </div>

        {/* Domain quick-action cards */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-14 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <DomainCard
            tone="physics"
            title="Physics Arena"
            text="Orbits, projectiles and fields you can push around."
            cta="Explore Physics"
            href="#simulations"
          />
          <DomainCard
            tone="chemistry"
            title="Chemistry Lab"
            text="Bonds, reactions and pH you can mix by hand."
            cta="Explore Chemistry"
            href="#simulations"
          />
        </motion.div>
      </div>
    </section>
  );
}
