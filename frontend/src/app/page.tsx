"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Atom,
  BookOpen,
  Bot,
  FlaskConical,
  PlayCircle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
  ShieldCheck,
  GraduationCap,
  BrainCircuit,
  MessageSquare,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: PlayCircle,
    title: "Lecture Streaming",
    text: "Physics and Chemistry classes organized by chapter, topic, and difficulty — ready to watch on any device.",
    badge: "HD Streaming",
    gradient: "from-cyan-500/20 to-blue-500/10",
    iconColor: "text-cyan-400",
  },
  {
    icon: BookOpen,
    title: "Curated Study Sheets",
    text: "Comprehensive PDF handouts, formula sheets, and past paper solutions searchable by topic.",
    badge: "PDF Downloads",
    gradient: "from-violet-500/20 to-indigo-500/10",
    iconColor: "text-violet-400",
  },
  {
    icon: Bot,
    title: "24/7 AI Academic Tutor",
    text: "Ask doubts in Bangla or English — complete with mathematical steps, formulas, and conceptual breakdowns.",
    badge: "Instant Doubt Solver",
    gradient: "from-indigo-500/20 to-purple-500/10",
    iconColor: "text-indigo-400",
  },
  {
    icon: Sparkles,
    title: "Smart Progress Planner",
    text: "Track completed lectures, monitor chapter mastery, and auto-schedule daily revision milestones.",
    badge: "Analytics Driven",
    gradient: "from-emerald-500/20 to-teal-500/10",
    iconColor: "text-emerald-400",
  },
];

const trustBadges = [
  "SSC & HSC Curriculum",
  "Bilingual AI Support (Bangla & English)",
  "Real-time Lecture Progress",
  "Instant Step-by-Step Solutions",
];

export default function Home() {
  const currentYear = new Date().getFullYear();

  return (
    <main className="azs-grid-bg relative min-h-screen text-slate-100 overflow-hidden selection:bg-indigo-500/30">
      {/* Ambient background glow orbs */}
      <div className="azs-orb azs-orb-indigo top-[-100px] left-1/2 -translate-x-1/2 h-[450px] w-[600px] opacity-40" />
      <div className="azs-orb azs-orb-cyan top-[300px] right-[-100px] h-[350px] w-[350px] opacity-25" />
      <div className="azs-orb azs-orb-violet bottom-[200px] left-[-100px] h-[400px] w-[400px] opacity-20" />

      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-slate-800/60 bg-[#060a12]/75">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/90 p-1 shadow-lg shadow-cyan-950/30 transition-transform group-hover:scale-105">
              <img
                src="/logo.png"
                alt="AZS logo"
                className="h-full w-full object-contain"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                AZS: The Catalyst
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/90">
                Science Coaching Ecosystem
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="azs-btn-ghost px-4 py-2 text-xs sm:text-sm font-semibold"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="azs-btn-primary px-4 py-2 text-xs sm:text-sm shadow-indigo-600/30"
            >
              <span>Join Batch</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-4 pt-12 pb-16 text-center sm:px-8 sm:pt-20 sm:pb-24">
        {/* Animated Badge Pill */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-950/40 px-4 py-1.5 text-xs font-bold text-cyan-300 backdrop-blur-md shadow-lg shadow-cyan-950/40"
        >
          <Atom className="h-4 w-4 animate-spin-slow text-cyan-400" />
          <span>Physics &amp; Chemistry Coaching Platform</span>
          <FlaskConical className="h-4 w-4 text-violet-400" />
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-[1.12]"
        >
          Master Science with{" "}
          <span className="azs-gradient-text">Interactive Lectures</span> &amp;{" "}
          <span className="text-white underline decoration-cyan-400/40 underline-offset-8">
            AI Guidance
          </span>
        </motion.h1>

        {/* Hero Paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg"
        >
          The complete academic portal for SSC and HSC students. Stream chapter-wise video classes, download structured study sheets, track your progress, and solve doubts 24/7 with your personal AI academic tutor.
        </motion.p>

        {/* Hero CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex w-full max-w-md flex-col gap-3.5 sm:max-w-none sm:flex-row sm:justify-center"
        >
          <Link
            href="/register"
            className="azs-btn-cyan px-7 py-3.5 text-sm sm:text-base font-extrabold group"
          >
            <span>Create Student Account</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/login"
            className="azs-btn-ghost px-7 py-3.5 text-sm sm:text-base font-bold border-slate-700/80 bg-slate-900/60 hover:bg-slate-800/80"
          >
            <span>Sign in to Portal</span>
          </Link>
        </motion.div>

        {/* Trust Chips Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs text-slate-400 font-medium"
        >
          {trustBadges.map((badge) => (
            <div key={badge} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{badge}</span>
            </div>
          ))}
        </motion.div>

        {/* Interactive AI Tutor & Portal Product Mockup Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative mt-14 w-full max-w-5xl rounded-2xl p-1 bg-gradient-to-b from-slate-700/60 via-slate-800/40 to-slate-900/80 shadow-2xl shadow-black/80"
        >
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0a0f1d] p-4 sm:p-6 text-left">
            {/* Window Top Controls Bar */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400">
                  azs-catalyst.app / student-portal
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="azs-badge azs-badge-emerald">
                  ● Live System Active
                </span>
              </div>
            </div>

            {/* Mock Dashboard Grid Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left Column: AI Tutor Chat Mock */}
              <div className="lg:col-span-2 rounded-xl border border-slate-800/90 bg-[#0d1424] p-4 sm:p-5 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">AZS Academic AI Tutor</p>
                      <p className="text-[10px] text-slate-400">Physics &amp; Chemistry Doubt Solver</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                    GPT-4o Academic
                  </span>
                </div>

                {/* Chat Bubbles */}
                <div className="space-y-3 font-sans text-xs">
                  {/* User Query */}
                  <div className="flex justify-end">
                    <div className="rounded-xl bg-indigo-600/90 px-3.5 py-2 text-white max-w-[85%] shadow-md">
                      Explain Snell&apos;s Law of Refraction with formula in Bangla.
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex gap-2.5 items-start">
                    <div className="h-6 w-6 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-3 w-3 text-cyan-400" />
                    </div>
                    <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-slate-200 space-y-1.5 max-w-[90%]">
                      <p className="font-semibold text-cyan-300">প্রতিসরণের স্নেলের সূত্র (Snell&apos;s Law):</p>
                      <p className="text-slate-300 leading-relaxed">
                        আলোর প্রতিসরণের ক্ষেত্রে, নির্দিষ্ট দুটি মাধ্যম এবং নির্দিষ্ট রঙের আলোর জন্য প্রতিসরণ কোণের সাইন (sin r) ও আপাতন কোণের সাইন (sin i) এর অনুপাত সর্বদা ধ্রুবক থাকে।
                      </p>
                      <div className="rounded bg-slate-950 p-2 font-mono text-cyan-400 border border-slate-800 my-1">
                        n₁ · sin(θ₁) = n₂ · sin(r)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Bar Mock */}
                <div className="flex gap-2 pt-2">
                  <div className="azs-input text-xs py-2 flex items-center justify-between text-slate-500 cursor-not-allowed">
                    <span>Ask a doubt in Bangla or English...</span>
                    <MessageSquare className="h-3.5 w-3.5 text-slate-600" />
                  </div>
                </div>
              </div>

              {/* Right Column: Student Progress Widgets */}
              <div className="space-y-3">
                {/* Active Chapter Card */}
                <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Current Chapter
                    </span>
                    <span className="azs-badge azs-badge-cyan">Physics</span>
                  </div>
                  <p className="text-xs font-extrabold text-white">
                    Chapter 4: Work, Power &amp; Energy
                  </p>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Lectures Completed</span>
                      <span className="text-cyan-400 font-mono font-bold">4 / 5 (80%)</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full w-[80%] rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500" />
                    </div>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-3 text-center">
                    <p className="text-lg font-black text-white">12</p>
                    <p className="text-[10px] text-slate-400">Chapters Unlocked</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-3 text-center">
                    <p className="text-lg font-black text-emerald-400">24/7</p>
                    <p className="text-[10px] text-slate-400">AI Doubts Solved</p>
                  </div>
                </div>

                {/* Study Sheet Quick Action */}
                <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-indigo-950/40 to-slate-900 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="h-4 w-4 text-violet-400" />
                    <div>
                      <p className="text-xs font-bold text-white">Formula Handout PDF</p>
                      <p className="text-[10px] text-slate-400">Ready for download</p>
                    </div>
                  </div>
                  <span className="text-xs text-indigo-400 font-bold">PDF ↗</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature Cards Grid Section */}
      <section className="relative mx-auto w-full max-w-7xl px-4 pb-24 sm:px-8">
        <div className="text-center mb-12">
          <span className="azs-badge azs-badge-indigo mb-3">
            Core Learning Features
          </span>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Everything You Need to Ace Your Exams
          </h2>
          <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
            Engineered specifically for SSC &amp; HSC Physics and Chemistry mastery.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text, badge, gradient, iconColor }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="azs-card-glow group relative rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5"
            >
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} border border-slate-700/60 transition-transform group-hover:scale-110`}>
                      <Icon className={`h-6 w-6 ${iconColor}`} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800">
                      {badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {text}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center text-xs font-semibold text-indigo-400 group-hover:text-cyan-300 transition-colors">
                  <span>Explore Feature</span>
                  <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Footer Banner */}
      <footer className="relative border-t border-slate-800/80 bg-[#040810] px-4 py-8 text-center text-xs text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-cyan-400" />
            <span className="font-semibold text-slate-300">
              AZS: The Catalyst
            </span>
            <span>· Academic Portal</span>
          </div>

          <p className="text-slate-400">
            © {currentYear} AZS: The Catalyst · Engineered by{" "}
            <a
              href="https://www.linkedin.com/in/sajedul-islam-data/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Mir Mohammad Sajedul Islam
            </a>
          </p>

          <div className="flex gap-4">
            <Link href="/login" className="hover:text-slate-200">
              Student Sign In
            </Link>
            <Link href="/register" className="hover:text-slate-200">
              New Batch Registration
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
