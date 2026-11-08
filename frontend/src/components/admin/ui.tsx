"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X, XCircle } from "lucide-react";
import { STATUS_META } from "./format";
import type { SubStatus } from "./types";

// ---------------------------------------------------------------- toasts + confirm dialogs

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}
interface UiApi {
  toast: (kind: "success" | "error", text: string) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}
const UiContext = createContext<UiApi | null>(null);

export function useUi(): UiApi {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi must be used inside <AdminUiProvider>");
  return ctx;
}

export function AdminUiProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; kind: "success" | "error"; text: string }[]>([]);
  const nextId = useRef(1);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const toast = useCallback((kind: "success" | "error", text: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 7000 : 3500);
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })),
    []
  );
  const answer = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  const api = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <UiContext.Provider value={api}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl ${
              t.kind === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-sky-200 bg-white text-[#075985]"
            }`}
          >
            {t.kind === "error" ? <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#CC310E]" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />}
            <span className="min-w-0 flex-1 break-words">{t.text}</span>
          </div>
        ))}
      </div>

      {dialog && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" onClick={() => answer(false)}>
          <div role="alertdialog" aria-modal="true" aria-label={dialog.title} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${dialog.danger ? "bg-rose-50 text-[#CC310E]" : "bg-sky-50 text-sky-700"}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-[#0F172A]">{dialog.title}</h3>
                {dialog.message && <p className="mt-1 text-sm leading-relaxed text-slate-600">{dialog.message}</p>}
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => answer(false)} className="min-h-[44px] rounded-xl border border-[#D3E3EF] px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => answer(true)}
                className={`min-h-[44px] rounded-xl px-4 text-sm font-bold text-white ${dialog.danger ? "bg-[#CC310E] hover:bg-[#A8270B]" : "bg-[#075985] hover:bg-[#0C4A6E]"}`}
              >
                {dialog.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </UiContext.Provider>
  );
}

// ---------------------------------------------------------------- small pieces

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden="true" />;
}

export function StatusPill({ status, small = false }: { status: SubStatus; small?: boolean }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border font-bold ${small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"} ${m.pill}`}>
      {m.label}
    </span>
  );
}

export function Bar({ percent, color = "#0369A1", height = "h-2" }: { percent: number; color?: string; height?: string }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className={`w-full overflow-hidden rounded-full bg-[#E2EDF5] ${height}`} role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${p}%`, backgroundColor: color }} />
    </div>
  );
}

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#E2EDF5] ${className}`} />;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#D3E3EF] bg-white p-4 shadow-sm sm:p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#075985]">{children}</h2>
      {aside}
    </div>
  );
}

export const inputClass =
  "w-full min-h-[44px] rounded-xl border border-[#D3E3EF] bg-white px-3 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#0369A1] focus:outline-none focus:ring-2 focus:ring-sky-100";
export const btnPrimary =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#075985] px-4 text-sm font-bold text-white transition-colors hover:bg-[#0C4A6E] disabled:cursor-not-allowed disabled:opacity-50";
export const btnAccent =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#CC310E] px-4 text-sm font-bold text-white transition-colors hover:bg-[#A8270B] disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhost =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#D3E3EF] bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

/** Side panel on large screens, full-height sheet on phones. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-900/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-full w-full flex-col bg-[#F3F8FC] shadow-2xl sm:max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#D3E3EF] bg-white px-4 py-3">
          <h2 className="min-w-0 truncate text-base font-extrabold text-[#075985]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-10">{children}</div>
      </aside>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-extrabold text-[#075985]">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
