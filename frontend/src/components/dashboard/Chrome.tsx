"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Bot, CloudOff, FileText, Flame, LayoutDashboard, LogOut, Menu, PlayCircle, Search, X, type LucideIcon } from "lucide-react";
import GlowIcon from "@/components/ui/GlowIcon";
import type { LevelInfo } from "@/lib/progress";
import type { View } from "@/lib/dashboard-types";
import type { SyncStatus } from "@/hooks/useProgress";

export const NAV: { id: View; label: string; short: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Command Deck", short: "Home", icon: LayoutDashboard },
  { id: "lectures", label: "Video Lectures", short: "Classes", icon: PlayCircle },
  { id: "materials", label: "Study Sheets", short: "Sheets", icon: FileText },
  { id: "ai", label: "AI Tutor", short: "AI Tutor", icon: Bot },
];

interface SidebarProps {
  view: View;
  open: boolean;
  name: string;
  batch: string;
  level: LevelInfo;
  counts: { lectures: number; materials: number };
  onNavigate: (v: View) => void;
  onClose: () => void;
  onLogout: () => void;
}

export function Sidebar({ view, open, name, batch, level, counts, onNavigate, onClose, onLogout }: SidebarProps) {
  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col justify-between border-r border-[#D3E3EF] bg-white/95 p-5 shadow-2xl transition-transform duration-300 ease-out md:sticky md:top-0 md:h-screen md:translate-x-0 md:bg-white/80 md:shadow-none md:backdrop-blur ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D3E3EF] bg-[#F3F8FC] p-2 shadow-sm">
                <Image src="/logo.png" alt="" width={40} height={40} className="h-full w-full object-contain" />
              </span>
              <span>
                <span className="block text-base font-black leading-tight text-[#075985]">AZS</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-[#CC310E]">The Catalyst</span>
              </span>
            </div>
            <button type="button" onClick={onClose} aria-label="Close menu" className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D3E3EF] bg-slate-50 text-slate-500 md:hidden">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-1.5">
            {NAV.map(({ id, label, icon: Icon }, i) => {
              const active = view === id;
              const badge = id === "lectures" ? counts.lectures : id === "materials" ? counts.materials : null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 text-sm font-bold transition-colors ${active ? "text-white" : "text-slate-600 hover:bg-sky-50 hover:text-[#075985]"}`}
                >
                  {active && <motion.span layoutId="sidebar-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#075985] to-[#0369A1] shadow-lg shadow-sky-900/20" />}
                  <span className="relative flex items-center gap-3">
                    {active ? <Icon className="h-5 w-5 text-white" /> : <GlowIcon icon={Icon} offset={i} size="sm" />}
                    {label}
                  </span>
                  {badge !== null && (
                    <span className={`relative ml-auto rounded-md px-2 py-0.5 font-mono text-[11px] ${active ? "bg-white/20 text-white" : "border border-[#D3E3EF] bg-slate-100 text-slate-700"}`}>{badge}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4 border-t border-[#D3E3EF] pt-5">
          <div className="rounded-2xl bg-gradient-to-br from-[#F3F8FC] to-[#FEF3EF] p-3">
            <div className="flex items-center justify-between text-[11px] font-black">
              <span className="text-[#075985]">Level {level.level}</span>
              <span className="text-slate-500">{level.xp} XP</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={level.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to level ${level.level + 1}`}>
              <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-[#CC310E] transition-all duration-700" style={{ width: `${level.pct}%` }} />
            </div>
            <p className="mt-1.5 text-[10px] font-semibold text-slate-500">{level.toNext} XP to level {level.level + 1}</p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-slate-900">{name}</p>
              <p className="truncate text-[10px] font-semibold text-slate-500">{batch}</p>
            </div>
            <button type="button" onClick={onLogout} title="Sign out" aria-label="Sign out" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

interface TopBarProps {
  query: string;
  streakDays: number;
  level: number;
  hasUnread: boolean;
  hasNotice: boolean;
  status: SyncStatus;
  pending: number;
  onQuery: (q: string) => void;
  onMenu: () => void;
  onBell: () => void;
}

export function TopBar({ query, streakDays, level, hasUnread, hasNotice, status, pending, onQuery, onMenu, onBell }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[#D3E3EF] bg-white/85 px-4 backdrop-blur-md sm:h-20 sm:px-8">
      <div className="flex max-w-md flex-1 items-center gap-3">
        <button type="button" onClick={onMenu} aria-label="Open menu" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#D3E3EF] bg-[#F3F8FC] text-slate-600 md:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            aria-label="Search lectures and sheets"
            placeholder="Search topic or chapter..."
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            className="h-12 w-full rounded-xl border border-[#D3E3EF] bg-[#F3F8FC] pl-11 pr-10 text-sm text-slate-900 focus:border-[#0369A1] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/20 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button type="button" onClick={() => onQuery("")} aria-label="Clear search" className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-slate-400">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {status === "offline" && (
          <span className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800 sm:flex" title="Your work is saved on this phone and will sync when you are back online">
            <CloudOff className="h-3.5 w-3.5" /> Offline{pending > 0 ? ` (${pending} to sync)` : ""}
          </span>
        )}
        <span className={`hidden h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-black sm:flex ${streakDays > 0 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-[#D3E3EF] bg-slate-50 text-slate-500"}`}>
          <Flame className={`h-4 w-4 ${streakDays > 0 ? "text-amber-500" : "text-slate-400"}`} />
          {streakDays > 0 ? `${streakDays}-day streak` : "No streak yet"}
        </span>
        <span className="flex h-10 items-center rounded-full bg-[#075985] px-3 text-xs font-black text-white" aria-label={`Level ${level}`}>
          Lv {level}
        </span>
        <button
          type="button"
          onClick={onBell}
          disabled={!hasNotice}
          aria-label={hasNotice ? (hasUnread ? "Open new notice" : "Open notice") : "No notices"}
          className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-[#D3E3EF] bg-[#F3F8FC] text-slate-600 enabled:active:scale-95 disabled:opacity-60"
        >
          <Bell className="h-5 w-5" />
          {hasUnread && <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-[#CC310E] ring-2 ring-white" />}
        </button>
      </div>
    </header>
  );
}

export function MobileDock({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  return (
    <nav aria-label="Quick navigation" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[#D3E3EF] bg-white/95 md:hidden">
      <ul className="mx-auto flex h-[68px] max-w-md items-center justify-around px-2">
        {NAV.map(({ id, short, icon: Icon }) => {
          const active = view === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onNavigate(id)}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[52px] min-w-[68px] flex-col items-center justify-center rounded-2xl px-3 transition-colors ${active ? "text-[#075985]" : "text-slate-400"}`}
              >
                {active && <motion.span layoutId="dock-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-2xl bg-sky-100" />}
                <Icon className="relative h-5 w-5" />
                <span className={`relative mt-1 text-[10px] tracking-tight ${active ? "font-black" : "font-semibold"}`}>{short}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
