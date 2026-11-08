"use client";

import { CreditCard, Lock, LogOut, MessageCircle, RefreshCw } from "lucide-react";
import { TEACHER } from "@/lib/social";

interface Props {
  name: string;
  status: "expired" | "pending";
  checking: boolean;
  onRecheck: () => void;
  onLogout: () => void;
}

const COPY = {
  pending: {
    title: "আপনার সাবস্ক্রিপশন এখনও চালু হয়নি",
    body: "ক্লাস ভিডিও, স্টাডি শিট ও AI টিউটর ব্যবহার করতে সাবস্ক্রিপশন চালু করতে হবে। স্যারকে ফি নগদ জমা দিন, জমা দেওয়ার পর আপনার অ্যাকাউন্ট চালু করে দেওয়া হবে।",
  },
  expired: {
    title: "আপনার সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে",
    body: "আবার ক্লাস ভিডিও, স্টাডি শিট ও AI টিউটর ব্যবহার করতে সাবস্ক্রিপশন নবায়ন করুন। স্যারকে ফি নগদ জমা দিন, জমা দেওয়ার পর আপনার অ্যাকাউন্ট আবার চালু করে দেওয়া হবে। আপনার এ পর্যন্ত করা সব প্রগ্রেস সংরক্ষিত আছে।",
  },
} as const;

/** The only thing an unpaid student sees: one renewal notice. */
export default function LockedScreen({ name, status, checking, onRecheck, onLogout }: Props) {
  const text = COPY[status];
  const first = name.trim().split(/\s+/)[0] || "";
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F8FC] p-4 font-sans">
      <div className="w-full max-w-md rounded-3xl border border-[#D3E3EF] bg-white p-6 text-center shadow-xl sm:p-8" role="alert">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-[#CC310E]">
          <Lock className="h-8 w-8" />
        </span>
        {first && <p className="mt-4 text-sm font-semibold text-slate-500">হ্যালো, {first}</p>}
        <h1 className="mt-1 text-xl font-black leading-snug text-[#075985]">{text.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{text.body}</p>

        <div className="mt-6 space-y-3">
          <a href={TEACHER.whatsapp} target="_blank" rel="noopener noreferrer" className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#CC310E] px-5 text-sm font-bold text-white shadow-md hover:bg-[#A8270B]">
            <MessageCircle className="h-5 w-5" /> স্যারকে হোয়াটসঅ্যাপে জানান
          </a>
          <button type="button" onClick={onRecheck} disabled={checking} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-[#D3E3EF] bg-white px-5 text-sm font-bold text-[#075985] hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw className={`h-5 w-5 ${checking ? "animate-spin" : ""}`} /> ফি জমা দিয়েছি, আবার চেক করুন
          </button>
          <button type="button" onClick={onLogout} className="flex min-h-[48px] w-full items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700">
            <LogOut className="h-4 w-4" /> লগ আউট
          </button>
        </div>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <CreditCard className="h-3.5 w-3.5" /> শুধু নগদ টাকায় ফি নেওয়া হয়
        </p>
      </div>
    </div>
  );
}
