import Link from "next/link";
import {
  Atom,
  BookOpen,
  Bot,
  FlaskConical,
  PlayCircle,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: PlayCircle,
    title: "Lecture streaming",
    text: "Physics and Chemistry classes organized by chapter, ready to watch.",
  },
  {
    icon: BookOpen,
    title: "Study sheets",
    text: "PDF handouts and notes in one place, searchable by topic.",
  },
  {
    icon: Bot,
    title: "AI tutor",
    text: "Ask doubts in Bangla or English — including formulas and worked steps.",
  },
  {
    icon: Sparkles,
    title: "Progress & planner",
    text: "Track watched lectures and schedule daily revision goals.",
  },
];

export default function Home() {
  return (
    <main className="azs-grid-bg min-h-screen text-slate-100">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 p-1">
            <img src="/logo.png" alt="AZS logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-tight text-white">AZS: The Catalyst</p>
            <p className="text-[11px] font-medium uppercase tracking-widest text-cyan-400">
              Science coaching
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500"
          >
            Join batch
          </Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-8 text-center sm:px-6 sm:pt-16">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
          <Atom className="h-3.5 w-3.5" />
          Physics &amp; Chemistry made smart
          <FlaskConical className="h-3.5 w-3.5" />
        </div>
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
          Your batch, lectures, and AI tutor — in one portal
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
          AZS: The Catalyst is the student dashboard for SSC and HSC science coaching.
          Stream classes, download sheets, track progress, and ask the AI tutor anytime.
        </p>
        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500"
          >
            Sign in to portal
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-slate-700 bg-slate-900/70 px-6 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Create student account
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-4 pb-20 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, text }) => (
          <article
            key={title}
            className="group rounded-2xl border border-slate-800/80 bg-[#111827]/85 p-5 text-left shadow-xl shadow-black/20 hover:border-indigo-500/40 hover:-translate-y-1 transition-all duration-200"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 group-hover:scale-105 transition-transform">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-bold text-white">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{text}</p>
          </article>
        ))}
      </section>

      <footer className="border-t border-slate-800/80 px-4 py-6 text-center text-xs text-slate-400">
        © 2026 AZS: The Catalyst · Developed with ❤️ by{" "}
        <a
          href="https://www.linkedin.com/in/sajedul-islam-data/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-indigo-400 hover:text-indigo-300"
        >
          Mir Mohammad Sajedul Islam
        </a>
      </footer>
    </main>
  );
}
