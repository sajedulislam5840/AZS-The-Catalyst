"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Atom, FlaskConical, Loader2, Magnet, Play, TestTube2, X, type LucideIcon } from "lucide-react";

const Loading = () => (
  <div className="flex h-64 items-center justify-center text-slate-500">
    <Loader2 className="h-6 w-6 animate-spin" />
  </div>
);

// Each game is its own chunk: nothing loads until a student launches it.
const ProjectileGame = dynamic(() => import("./sims/ProjectileGame"), { ssr: false, loading: Loading });
const BohrAtom = dynamic(() => import("./sims/BohrAtom"), { ssr: false, loading: Loading });
const MoleculeShapes = dynamic(() => import("./sims/MoleculeShapes"), { ssr: false, loading: Loading });
const PhScale = dynamic(() => import("./sims/PhScale"), { ssr: false, loading: Loading });

interface Sim {
  id: string;
  icon: LucideIcon;
  title: string;
  text: string;
  goal: string;
  subject: "physics" | "chemistry";
  Component: ComponentType;
}

const SIMS: Sim[] = [
  { id: "projectile", icon: Magnet, title: "Projectile Motion", text: "Change angle and speed, watch the arc.", goal: "Hit moving-distance targets on Earth, Moon and Mars.", subject: "physics", Component: ProjectileGame },
  { id: "bohr", icon: Atom, title: "Bohr Atom", text: "Excite electrons between energy levels.", goal: "Fire off real hydrogen spectral lines and finish 4 challenges.", subject: "physics", Component: BohrAtom },
  { id: "molecule", icon: FlaskConical, title: "Molecule Shapes", text: "Build molecules and see bond angles.", goal: "Rotate 3D VSEPR shapes, then quiz yourself on all 13.", subject: "chemistry", Component: MoleculeShapes },
  { id: "ph", icon: TestTube2, title: "pH Scale", text: "Mix solutions and read the colour.", goal: "Guess the pH of everyday liquids over 5 rounds.", subject: "chemistry", Component: PhScale },
];

function SimModal({ sim, onClose }: { sim: Sim; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus();
    };
  }, [onClose]);

  const physics = sim.subject === "physics";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sim-title"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-sky-200 bg-[#F3F8FC] shadow-2xl sm:rounded-3xl"
      >
        <div className={`h-1.5 w-full ${physics ? "bg-sky-500" : "bg-[#CC310E]"}`} />
        <div className="flex items-center justify-between gap-3 border-b border-sky-100 bg-white px-5 py-3">
          <div className="flex items-center gap-3">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${physics ? "bg-sky-100 text-sky-700" : "bg-[#CC310E]/10 text-[#CC310E]"}`}>
              <sim.icon className="h-5 w-5" />
            </span>
            <div>
              <h3 id="sim-title" className="font-extrabold text-slate-900">{sim.title}</h3>
              <p className="text-xs text-slate-500">{sim.goal}</p>
            </div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close simulation" className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-sky-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6">
          <sim.Component />
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SimulationsSection() {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = SIMS.find((s) => s.id === openId) ?? null;

  return (
    <section id="simulations" className="scroll-mt-20 bg-[#F3F8FC] px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }} className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#CC310E]">Simulations</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Learn by changing the variables</h2>
          <p className="mt-3 text-slate-600">Four playable simulations. Pick one and launch it right here, no account needed.</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SIMS.map((s, i) => {
            const physics = s.subject === "physics";
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                whileHover={{ y: -4 }}
                className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${physics ? "border-sky-300/70" : "border-[#CC310E]/25"}`}
              >
                <s.icon className={`h-6 w-6 ${physics ? "text-sky-600" : "text-[#CC310E]"}`} />
                <h3 className="mt-3 font-extrabold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.text}</p>
                <p className="mt-2 flex-1 text-xs text-slate-500">{s.goal}</p>
                <button
                  type="button"
                  onClick={() => setOpenId(s.id)}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#CC310E] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_8px_24px_-8px_rgba(204,49,14,0.7)] transition hover:bg-[#A8270B] active:scale-95"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Launch
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>{open && <SimModal key={open.id} sim={open} onClose={() => setOpenId(null)} />}</AnimatePresence>
    </section>
  );
}
