"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#simulations", label: "Simulations" },
  { href: "#sandbox", label: "Sandbox" },
  { href: "#curriculum", label: "Curriculum" },
  { href: "#about", label: "About" },
] as const;

interface LandingNavbarProps {
  /** Replace the default logo with your own node (e.g. a custom <Image>). */
  logo?: ReactNode;
  brandName?: string;
  tagline?: string;
}

export default function LandingNavbar({
  logo,
  brandName = "AZS: The Catalyst",
  tagline = "Science Coaching",
}: LandingNavbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-sky-200/70 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Left: brand */}
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-sky-200 bg-white">
            {logo ?? (
              <Image
                src="/logo.png"
                alt="AZS logo"
                width={40}
                height={40}
                className="h-full w-full object-contain p-1"
                priority
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold tracking-tight text-sky-900">
              {brandName}
            </p>
            <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {tagline}
            </p>
          </div>
        </Link>

        {/* Center: links */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-sky-100/70 hover:text-sky-900"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Right: auth CTAs */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-sky-900 sm:block"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-[#CC310E] px-4 py-2 text-sm font-bold text-white shadow-[0_6px_20px_-6px_rgba(204,49,14,0.65)] transition hover:bg-[#A8270B] active:scale-95"
          >
            Get Started
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-sky-100/70 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-sky-200/70 bg-white/90 md:hidden"
            aria-label="Mobile"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-sky-100/70"
                >
                  {l.label}
                </a>
              ))}
              <Link
                href="/login"
                className="rounded-lg px-3 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-100/70"
              >
                Login
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
