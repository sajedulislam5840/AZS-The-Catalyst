"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileDown, FileSpreadsheet, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { errorText } from "./format";
import { currentMonth, downloadCsv, monthLabel, monthRange, openPdf, stamp } from "./ledgerExport";
import type { Ledger } from "./types";
import { btnGhost, Card, Skeleton, useUi } from "./ui";

function shift(month: string, by: number): string {
  const { start } = monthRange(month);
  const d = new Date(start.getFullYear(), start.getMonth() + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface Props {
  onOpenStudent: (id: string) => void;
}

export default function PaymentsTab({ onOpenStudent }: Props) {
  const { toast } = useUi();
  const [month, setMonth] = useState(currentMonth);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonth = useCallback(async (m: string) => {
    const { start, end } = monthRange(m);
    try {
      const { data } = await api.get<Ledger>("/api/v1/admin/payments", { params: { start: start.toISOString(), end: end.toISOString() } });
      setLedger(data);
      setError(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMonth(month);
  }, [month, fetchMonth]);

  const go = (m: string) => {
    if (m === month) return;
    setLoading(true);
    setLedger(null);
    setMonth(m);
  };

  const reload = () => {
    setLoading(true);
    void fetchMonth(month);
  };

  const pdf = () => {
    if (!ledger) return;
    if (!openPdf(ledger, month)) toast("error", "Your browser blocked the new page. Allow pop-ups for this site and try again.");
  };

  const isNow = month === currentMonth();
  const t = ledger?.totals;

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => go(shift(month, -1))} aria-label="Previous month" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D3E3EF] text-slate-600 hover:bg-slate-50">
            <ChevronLeft className="h-5 w-5" />
          </button>
          {/* The month name is the button: an invisible month picker sits on top of it. */}
          <label className="relative min-w-0 flex-1 cursor-pointer text-center">
            <span className="block text-base font-black text-[#075985]">{monthLabel(month)}</span>
            <span className="block text-[11px] font-semibold text-slate-500">Tap to pick a month</span>
            <input
              type="month"
              value={month}
              max={currentMonth()}
              onChange={(e) => e.target.value && go(e.target.value)}
              aria-label="Pick a month"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          <button type="button" onClick={() => go(shift(month, 1))} disabled={isNow} aria-label="Next month" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D3E3EF] text-slate-600 hover:bg-slate-50 disabled:opacity-30">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => ledger && downloadCsv(ledger, month)} disabled={!ledger} className={`${btnGhost} whitespace-nowrap !px-2`}>
            <FileSpreadsheet className="h-4 w-4" /> Download CSV
          </button>
          <button type="button" onClick={pdf} disabled={!ledger} className={`${btnGhost} whitespace-nowrap !px-2`}>
            <FileDown className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </Card>

      {loading && !ledger ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : error && !ledger ? (
        <Card className="text-center">
          <p className="text-sm font-semibold text-slate-600">{error}</p>
          <button type="button" onClick={reload} className={`${btnGhost} mt-3`}>
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </Card>
      ) : ledger && t ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Total label="Collected" value={`৳${t.amount.toLocaleString("en-US")}`} />
            <Total label="Renewals" value={String(t.payments)} />
            <Total label="Students" value={String(t.students)} />
          </div>
          {(t.amounts_recorded < t.payments || t.voided > 0) && (
            <p className="px-1 text-[11px] text-slate-500">
              {t.amounts_recorded < t.payments && `${t.payments - t.amounts_recorded} renewal${t.payments - t.amounts_recorded === 1 ? "" : "s"} without an amount entered. `}
              {t.voided > 0 && `${t.voided} undone, shown crossed out and not counted.`}
            </p>
          )}

          {ledger.payments.length === 0 ? (
            <Card className="py-10 text-center text-sm text-slate-500">No payments recorded in {monthLabel(month)}.</Card>
          ) : (
            <ul className="space-y-2">
              {[...ledger.payments].reverse().map((p) => (
                <li key={p.id} className={`rounded-2xl border border-[#D3E3EF] bg-white p-3 shadow-sm ${p.voided ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <button type="button" onClick={() => onOpenStudent(p.student_id)} className={`block max-w-full truncate text-left text-sm font-extrabold text-[#075985] hover:underline ${p.voided ? "line-through" : ""}`}>
                        {p.full_name}
                      </button>
                      <p className="truncate text-[11px] text-slate-500">
                        {stamp(p.created_at)} · {p.batch_no} · +{p.days_added} days
                      </p>
                      {p.note && <p className="mt-0.5 truncate text-[11px] text-slate-600">{p.note}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-black ${p.voided ? "text-slate-400 line-through" : "text-[#0F172A]"}`}>{p.amount === null ? "-" : `৳${p.amount.toLocaleString("en-US")}`}</p>
                      {p.voided && <span className="text-[10px] font-bold text-rose-700">Undone</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#D3E3EF] bg-white px-2 py-3 text-center shadow-sm">
      <p className="truncate text-lg font-black text-[#0F172A]">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
