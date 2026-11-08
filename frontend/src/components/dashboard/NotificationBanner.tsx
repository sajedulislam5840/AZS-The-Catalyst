"use client";

import { BellRing, CheckCircle2, X } from "lucide-react";
import type { AppNotification } from "@/lib/dashboard-types";

/** Shows the newest unread message (renewal warning / renewed) at the top of the dashboard. */
export default function NotificationBanner({ items, onDismiss }: { items: AppNotification[]; onDismiss: () => void }) {
  const latest = items.find((n) => !n.read);
  if (!latest) return null;
  const good = latest.kind === "renewed";
  return (
    <div
      role="status"
      className={`flex items-start gap-3 border-b px-4 py-3 sm:px-8 ${good ? "border-sky-200 bg-sky-50 text-sky-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}
    >
      {good ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" /> : <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">{latest.title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-slate-700">{latest.body}</p>
      </div>
      <button type="button" onClick={onDismiss} aria-label="বন্ধ করুন" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-white/60">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
