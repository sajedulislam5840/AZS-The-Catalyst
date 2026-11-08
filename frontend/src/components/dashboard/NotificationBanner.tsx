"use client";

import { BellRing, CheckCircle2, CreditCard, X } from "lucide-react";
import type { AppNotification } from "@/lib/dashboard-types";

interface Props {
  items: AppNotification[];
  onDismiss: () => void;
  /** Where the "pay" button goes. Left out, no button is shown. */
  renewHref?: string;
}

/** The newest unread message (renewal warning or renewal confirmation) at the top of the dashboard. */
export default function NotificationBanner({ items, onDismiss, renewHref }: Props) {
  const latest = items.find((n) => !n.read);
  if (!latest) return null;
  const good = latest.kind === "renewed";
  return (
    <div role="status" className={`border-b px-4 py-3 sm:px-8 ${good ? "border-sky-200 bg-sky-50 text-sky-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
      <div className="mx-auto flex max-w-6xl items-start gap-3">
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${good ? "bg-sky-100 text-sky-600" : "bg-amber-100 text-amber-600"}`}>
          {good ? <CheckCircle2 className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
          <p className="text-sm font-extrabold leading-snug">{latest.title}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-slate-700">{latest.body}</p>
          </div>
          {!good && renewHref && (
            <a href={renewHref} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex shrink-0 sm:mt-0 min-h-[44px] items-center gap-2 rounded-xl bg-[#CC310E] px-4 text-xs font-bold text-white shadow-sm active:scale-[0.98]">
              <CreditCard className="h-4 w-4" /> স্যারকে জানান
            </a>
          )}
        </div>
        <button type="button" onClick={onDismiss} aria-label="বন্ধ করুন" className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-white/60">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
