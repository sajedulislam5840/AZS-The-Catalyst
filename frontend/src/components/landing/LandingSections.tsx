"use client";

import { motion } from "framer-motion";
import { BookOpen, Bot, PlayCircle, Sparkles, type LucideIcon } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
} as const;

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <motion.div {...fadeUp} className="mx-auto mb-10 max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-[#CC310E]">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      <p className="mt-3 text-slate-600">{text}</p>
    </motion.div>
  );
}

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: PlayCircle, title: "Lecture Streaming", text: "Physics and Chemistry classes organised by chapter and topic, on any device." },
  { icon: BookOpen, title: "Curated Study Sheets", text: "PDF handouts, formula sheets and past-paper solutions by topic." },
  { icon: Bot, title: "24/7 AI Academic Tutor", text: "Ask doubts in Bangla or English with step-by-step maths." },
  { icon: Sparkles, title: "Smart Progress Planner", text: "Track finished lectures and schedule daily revision." },
];

export function CurriculumSection() {
  return (
    <section id="curriculum" className="scroll-mt-20 bg-[#F3F8FC] px-4 pb-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Curriculum"
          title="SSC & HSC Physics and Chemistry"
          text="Everything a student needs, in one place."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="flex gap-4 rounded-2xl border border-sky-200 bg-white p-5 shadow-sm"
            >
              <f.icon className="mt-0.5 h-6 w-6 shrink-0 text-sky-600" />
              <div>
                <h3 className="font-extrabold text-slate-900">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{f.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
