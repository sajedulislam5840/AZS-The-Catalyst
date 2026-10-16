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
  GraduationCap,
  MessageSquare,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";

const features = [
  {
    icon: PlayCircle,
    title: "Lecture Streaming",
    text: "Physics and Chemistry classes organized by chapter, topic, and difficulty — ready to watch on any device.",
    badge: "HD Streaming",
    subject: "physics" as const,
  },
  {
    icon: BookOpen,
    title: "Curated Study Sheets",
    text: "Comprehensive PDF handouts, formula sheets, and past paper solutions searchable by topic.",
    badge: "PDF Downloads",
    subject: "chemistry" as const,
  },
  {
    icon: Bot,
    title: "24/7 AI Academic Tutor",
    text: "Ask doubts in Bangla or English — complete with mathematical steps, formulas, and conceptual breakdowns.",
    badge: "Instant Doubt Solver",
    subject: "physics" as const,
  },
  {
    icon: Sparkles,
    title: "Smart Progress Planner",
    text: "Track completed lectures, monitor chapter mastery, and auto-schedule daily revision milestones.",
    badge: "Analytics Driven",
    subject: "chemistry" as const,
  },
];

const trustBadges = [
  "SSC & HSC Curriculum",
  "Bilingual AI (Bangla & English)",
  "Real-time Lecture Progress",
  "Step-by-Step Solutions",
];

export default function Home() {
  return (
    <main className="azs-grid-bg relative min-h-screen text-foreground overflow-x-hidden">
      {/* ── Sticky Nav ── */}
      <header className="sticky top-0 z-50 border-b border-[#E6E1D8] bg-[#FAF8F5]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3 min-w-0 group">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center overflow-hidden rounded-xl border border-[#E6E1D8] bg-white shadow-sm shrink-0">
              <img
                src="/logo.png"
                alt="AZS logo"
                className="h-full w-full object-contain p-1"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-extrabold tracking-tight text-[#1E3A8A] truncate">
                AZS: The Catalyst
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] truncate">
                Science Coaching
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/login"
              className="azs-btn-ghost !w-auto min-h-[44px] px-3.5 sm:px-5 text-xs sm:text-sm"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="azs-btn-primary !w-auto min-h-[44px] px-3.5 sm:px-5 text-xs sm:text-sm"
            >
              <span>Join Batch</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pt-10 pb-14 text-center sm:px-6 sm:pt-16 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E6E1D8] bg-white px-3.5 py-1.5 text-[11px] sm:text-xs font-bold text-[#1E3A8A] shadow-sm"
        >
          <Atom className="h-3.5 w-3.5 text-[#0369A1]" />
          <span>Physics &amp; Chemistry Coaching</span>
          <FlaskConical className="h-3.5 w-3.5 text-[#047857]" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="max-w-3xl text-3xl font-extrabold tracking-tight text-[#1E293B] sm:text-5xl sm:leading-[1.15]"
        >
          Master Science with{" "}
          <span className="text-[#1E3A8A]">Interactive Lectures</span>
          {" & "}
          <span className="text-[#047857]">AI Guidance</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-4 max-w-2xl text-sm leading-relaxed text-[#64748B] sm:text-base"
        >
          The complete academic portal for SSC and HSC students. Stream chapter-wise
          classes, download study sheets, track progress, and solve doubts 24/7 with
          your AI academic tutor — built for phone and tablet first.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-7 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center"
        >
          <Link
            href="/register"
            className="azs-btn-primary min-h-[48px] px-6 text-sm sm:text-base !w-full sm:!w-auto"
          >
            <span>Create Student Account</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="azs-btn-ghost min-h-[48px] px-6 text-sm sm:text-base !w-full sm:!w-auto"
          >
            Sign in to Portal
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[#64748B] font-medium"
        >
          {trustBadges.map((badge) => (
            <div key={badge} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#047857] shrink-0" />
              <span>{badge}</span>
            </div>
          ))}
        </motion.div>

        {/* Product preview — cream paper mock */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          className="relative mt-12 w-full max-w-5xl"
        >
          <div className="overflow-hidden rounded-2xl border border-[#E6E1D8] bg-white shadow-[0_8px_30px_-8px_rgba(30,41,59,0.12)] text-left">
            {/* Window chrome */}
            <div className="flex items-center justify-between border-b border-[#E6E1D8] bg-[#F3EFE8]/80 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-2.5 w-2.5 rounded-full bg-[#F87171]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#34D399]" />
                <span className="ml-2 text-[10px] sm:text-xs font-mono text-[#64748B] truncate">
                  azs-catalyst.app / student-portal
                </span>
              </div>
              <span className="azs-badge azs-badge-emerald shrink-0 hidden xs:inline-flex sm:inline-flex">
                Live
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 sm:p-5">
              {/* AI mock */}
              <div className="lg:col-span-2 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] p-4 flex flex-col space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D8]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E3A8A]/10 text-[#1E3A8A] border border-[#1E3A8A]/15 shrink-0">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1E293B]">AZS Academic AI Tutor</p>
                      <p className="text-[10px] text-[#64748B]">Physics &amp; Chemistry · Bangla / English</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#0369A1] bg-[#0369A1]/10 px-2 py-0.5 rounded-md border border-[#0369A1]/15 shrink-0">
                    AI Solver
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-end">
                    <div className="rounded-2xl rounded-br-md bg-[#1E3A8A] px-3.5 py-2.5 text-white max-w-[88%] shadow-sm">
                      Explain Snell&apos;s Law of Refraction with formula in Bangla.
                    </div>
                  </div>

                  <div className="flex gap-2 items-start">
                    <div className="h-7 w-7 rounded-full bg-[#047857]/10 border border-[#047857]/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-3 w-3 text-[#047857]" />
                    </div>
                    <div className="rounded-2xl rounded-bl-md bg-white border border-[#E6E1D8] p-3 text-[#1E293B] space-y-1.5 max-w-[90%] shadow-sm">
                      <p className="font-semibold text-[#0369A1]">
                        প্রতিসরণের স্নেলের সূত্র (Snell&apos;s Law):
                      </p>
                      <p className="text-[#64748B] leading-relaxed">
                        আলোর প্রতিসরণের ক্ষেত্রে, নির্দিষ্ট দুটি মাধ্যম এবং নির্দিষ্ট রঙের আলোর জন্য
                        প্রতিসরণ কোণের সাইন (sin r) ও আপতন কোণের সাইন (sin i) এর অনুপাত সর্বদা ধ্রুবক থাকে।
                      </p>
                      <div className="rounded-lg bg-[#F3EFE8] p-2 font-mono text-[#1E3A8A] border border-[#E6E1D8] text-[11px]">
                        n₁ · sin(θ₁) = n₂ · sin(θ₂)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="azs-input text-xs !min-h-[44px] flex items-center justify-between text-[#94A3B8] pointer-events-none">
                  <span>Ask a doubt in Bangla or English…</span>
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Progress widgets */}
              <div className="space-y-3">
                <div className="rounded-xl border border-[#E6E1D8] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                      Current Chapter
                    </span>
                    <span className="azs-badge azs-badge-physics">Physics</span>
                  </div>
                  <p className="text-sm font-extrabold text-[#1E293B]">
                    Chapter 4: Work, Power &amp; Energy
                  </p>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#64748B]">Lectures</span>
                      <span className="text-[#0369A1] font-mono font-bold">4 / 5 · 80%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#F3EFE8] overflow-hidden border border-[#E6E1D8]">
                      <div className="h-full w-[80%] rounded-full bg-[#0369A1]" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] p-3 text-center">
                    <p className="text-lg font-black text-[#1E3A8A]">12</p>
                    <p className="text-[10px] text-[#64748B]">Chapters</p>
                  </div>
                  <div className="rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] p-3 text-center">
                    <p className="text-lg font-black text-[#047857]">24/7</p>
                    <p className="text-[10px] text-[#64748B]">AI Tutor</p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E6E1D8] bg-white p-3.5 flex items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BookOpen className="h-4 w-4 text-[#047857] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1E293B] truncate">Formula Handout</p>
                      <p className="text-[10px] text-[#64748B]">PDF ready</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#1E3A8A] font-bold shrink-0">PDF ↗</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="text-center mb-10">
          <span className="azs-badge azs-badge-indigo mb-3">Core Features</span>
          <h2 className="text-2xl font-extrabold text-[#1E293B] sm:text-3xl">
            Everything you need to ace your exams
          </h2>
          <p className="mt-2 text-sm text-[#64748B] max-w-lg mx-auto">
            Built for SSC &amp; HSC Physics and Chemistry — optimized for phone and tablet study.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text, badge, subject }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              className="azs-card azs-glass-hover rounded-2xl p-5 flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-4 gap-2">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                    subject === "physics"
                      ? "bg-[#0369A1]/10 border-[#0369A1]/20 text-[#0369A1]"
                      : "bg-[#047857]/10 border-[#047857]/20 text-[#047857]"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold text-[#64748B] bg-[#F3EFE8] px-2.5 py-1 rounded-full border border-[#E6E1D8]">
                  {badge}
                </span>
              </div>

              <h3 className="text-sm font-extrabold text-[#1E293B]">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#64748B] flex-1">{text}</p>

              <div className="mt-4 pt-3 border-t border-[#E6E1D8] flex items-center text-xs font-bold text-[#1E3A8A]">
                <span>Explore</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </motion.article>
          ))}
        </div>

        {/* Quick Join Strip */}
        <div className="mt-12 rounded-2xl border border-[#E6E1D8] bg-white p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 text-[#1E293B]">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A8A]/10 text-[#1E3A8A] flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold">Ready to start studying?</h4>
              <p className="text-xs text-[#64748B]">Enroll in the current batch or log in to your account.</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Link
              href="/login"
              className="azs-btn-ghost !w-auto flex-1 sm:flex-none min-h-[44px] px-4 text-xs font-bold"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="azs-btn-primary !w-auto flex-1 sm:flex-none min-h-[44px] px-5 text-xs font-bold"
            >
              <span>Join Batch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Single Unified Site Footer ── */}
      <SiteFooter />
    </main>
  );
}
