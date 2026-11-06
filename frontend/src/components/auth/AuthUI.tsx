"use client";

import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { FlaskAccent, TrajectoryOverlay } from "@/components/landing/HeroAccents";
import SiteFooter from "@/components/SiteFooter";

/** Shared input look: white field, sky border, sky focus ring. */
export const authInputClass =
  "h-12 w-full rounded-xl border border-sky-200 bg-white pl-11 pr-4 text-base text-slate-900 sm:text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20";

interface AuthShellProps {
  children: ReactNode;
  /** Wider card for longer forms. */
  wide?: boolean;
  /** Optional pill shown top-right, e.g. "Secure Portal". */
  badge?: ReactNode;
  /** Replace the default logo with your own node. */
  logo?: ReactNode;
}

/** Page frame for /login and /register, matching the landing page look. */
export function AuthShell({ children, wide = false, badge, logo }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#F3F8FC] text-slate-900">
      {/* Backdrop: vector grid, sky-to-warm blend, drifting glows */}
      <div aria-hidden="true" className="azs-vector-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(125,211,252,0.45),rgba(243,248,252,0)_42%,rgba(243,248,252,0)_58%,rgba(250,195,176,0.5))]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl azs-drift" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-20 h-72 w-72 rounded-full bg-[#CC310E]/15 blur-3xl azs-drift [animation-delay:-3s]" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-24 left-6 hidden xl:block">
        <TrajectoryOverlay />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute right-10 top-28 hidden xl:block">
        <FlaskAccent />
      </div>

      {/* Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-sky-200 bg-white">
            {logo ?? (
              <Image src="/logo.png" alt="AZS logo" width={40} height={40} className="h-full w-full object-contain p-1" priority />
            )}
          </div>
          <span className="truncate text-sm font-extrabold tracking-tight text-sky-900">AZS: The Catalyst</span>
        </Link>
        <div className="flex items-center gap-2">
          {badge}
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3.5 py-2 text-xs font-bold text-sky-900 md:backdrop-blur transition hover:border-sky-400 hover:bg-white active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 text-sky-600" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Card */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`w-full ${wide ? "max-w-xl" : "max-w-md"} overflow-hidden rounded-3xl border border-sky-200 bg-white/95 shadow-[0_20px_60px_-20px_rgba(7,89,133,0.25)] md:bg-white/85 md:backdrop-blur-xl`}
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-sky-300 to-[#CC310E]" />
          <div className="p-6 sm:p-9">{children}</div>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}

export function AuthHeading({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-7 text-center">
      <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
      <p className="mt-1.5 text-sm text-slate-600">{text}</p>
    </div>
  );
}

export function ErrorAlert({ message }: { message: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span className="font-medium leading-relaxed">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Label + icon wrapper. Give the input inside the same `id` and `authInputClass`. */
export function Field({
  id,
  label,
  icon: Icon,
  right,
  children,
}: {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Extra element on the right of the input, e.g. a show-password button. */
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-700">
        {label}
      </label>
      <div className="relative">
        {children}
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        {right}
      </div>
    </div>
  );
}

export function SubmitButton({
  loading,
  loadingText,
  children,
}: {
  loading: boolean;
  loadingText: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#CC310E] px-5 text-sm font-extrabold text-white shadow-[0_10px_30px_-8px_rgba(204,49,14,0.7)] transition hover:bg-[#A8270B] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
