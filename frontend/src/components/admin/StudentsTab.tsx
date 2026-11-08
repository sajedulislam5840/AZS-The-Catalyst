"use client";

import React, { useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import api from "@/lib/api";
import { errorText, fmtDate, initials, STATUS_META, timeAgo } from "./format";
import type { Student, SubStatus } from "./types";
import { Bar, btnGhost, Card, inputClass, Skeleton, Spinner, StatusPill, useUi } from "./ui";

type Filter = SubStatus | "ALL";
type Sort = "newest" | "name" | "days" | "progress";

const PAGE = 40;

interface Props {
  students: Student[];
  loading: boolean;
  error: string | null;
  filter: Filter;
  onFilter: (f: Filter) => void;
  onOpen: (id: string) => void;
  onChanged: () => void;
  onRetry: () => void;
}

export default function StudentsTab({ students, loading, error, filter, onFilter, onOpen, onChanged, onRetry }: Props) {
  const { toast, confirm } = useUi();
  const [query, setQuery] = useState("");
  const [batch, setBatch] = useState("ALL");
  const [sort, setSort] = useState<Sort>("newest");
  const [shown, setShown] = useState(PAGE);
  const [busyId, setBusyId] = useState<string | null>(null);

  const batches = useMemo(() => Array.from(new Set(students.map((s) => (s.batch_no || "General").trim() || "General"))).sort(), [students]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: students.length, active: 0, expiring: 0, expired: 0, pending: 0 };
    students.forEach((s) => (c[s.status] += 1));
    return c;
  }, [students]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = students.filter((s) => {
      if (filter !== "ALL" && s.status !== filter) return false;
      if (batch !== "ALL" && ((s.batch_no || "General").trim() || "General") !== batch) return false;
      if (!q) return true;
      return [s.full_name, s.email, s.school, s.grade_class].some((v) => (v || "").toLowerCase().includes(q));
    });
    const by: Record<Sort, (a: Student, b: Student) => number> = {
      newest: (a, b) => (b.created_at || "").localeCompare(a.created_at || ""),
      name: (a, b) => a.full_name.localeCompare(b.full_name),
      days: (a, b) => (a.status === "pending" ? 9999 : a.days_left) - (b.status === "pending" ? 9999 : b.days_left),
      progress: (a, b) => b.progress_percent - a.progress_percent,
    };
    return [...list].sort(by[sort]);
  }, [students, filter, batch, query, sort]);

  const quickRenew = async (s: Student) => {
    const ok = await confirm({
      title: `Renew ${s.full_name} for 30 days?`,
      message: "Only do this after you have received the cash. It will be saved in the payment history, and you can undo it.",
      confirmLabel: "Yes, cash received",
    });
    if (!ok) return;
    setBusyId(s.id);
    try {
      const { data } = await api.post(`/api/v1/admin/students/${s.id}/renew`, { days: 30 });
      toast("success", `${s.full_name} is active until ${fmtDate(data.subscription_end_date)}.`);
      onChanged();
    } catch (err) {
      toast("error", errorText(err));
    } finally {
      setBusyId(null);
    }
  };

  const chips: Filter[] = ["ALL", "active", "expiring", "expired", "pending"];

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE);
            }}
            placeholder="Search name, email, school or class"
            aria-label="Search students"
            className={`${inputClass} pl-9`}
          />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filter by subscription">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={filter === c}
              onClick={() => {
                onFilter(c);
                setShown(PAGE);
              }}
              className={`min-h-[40px] shrink-0 rounded-full border px-3.5 text-xs font-bold transition-colors ${
                filter === c ? "border-[#075985] bg-[#075985] text-white" : "border-[#D3E3EF] bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {c === "ALL" ? "All" : STATUS_META[c].label} <span className={filter === c ? "text-sky-100" : "text-slate-400"}>{counts[c]}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="Batch" className={inputClass}>
            <option value="ALL">All batches</option>
            {batches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort" className={inputClass}>
            <option value="newest">Newest first</option>
            <option value="name">Name A to Z</option>
            <option value="days">Ending soonest</option>
            <option value="progress">Most progress</option>
          </select>
        </div>
      </Card>

      {loading && students.length === 0 ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error && students.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm font-semibold text-slate-600">{error}</p>
          <button type="button" onClick={onRetry} className={`${btnGhost} mt-3`}>
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="py-10 text-center text-sm text-slate-500">{students.length === 0 ? "No students have registered yet." : "No student matches these filters."}</Card>
      ) : (
        <>
          <p className="px-1 text-xs font-semibold text-slate-500">
            {rows.length} {rows.length === 1 ? "student" : "students"}. Tap a name to see their progress.
          </p>
          <ul className="space-y-3">
            {rows.slice(0, shown).map((s) => (
              <li key={s.id} className="rounded-2xl border border-[#D3E3EF] bg-white p-3 shadow-sm sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-black text-[#075985]" aria-hidden="true">
                    {initials(s.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => onOpen(s.id)} className="block max-w-full truncate text-left text-[15px] font-extrabold text-[#075985] hover:underline">
                      {s.full_name}
                    </button>
                    <p className="truncate text-xs text-slate-500">
                      {s.email} · {s.batch_no || "General"}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <Bar percent={s.progress_percent} color={s.progress_percent >= 100 ? "#16A34A" : "#0369A1"} />
                      <span className="w-9 shrink-0 text-right text-xs font-black text-[#0F172A]">{s.progress_percent}%</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {s.completed_lectures} lectures done · active {timeAgo(s.last_active).toLowerCase()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusPill status={s.status} small />
                    <span className="text-[11px] font-semibold text-slate-500">
                      {s.status === "pending" ? "Not paid" : s.days_left > 0 ? `${s.days_left} day${s.days_left === 1 ? "" : "s"} left` : `Ended ${fmtDate(s.subscription_end_date)}`}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => onOpen(s.id)} className={`${btnGhost} flex-1 !min-h-[42px] text-xs`}>
                    Progress & details
                  </button>
                  <button
                    type="button"
                    onClick={() => void quickRenew(s)}
                    disabled={busyId === s.id}
                    className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#CC310E] px-3 text-xs font-bold text-white transition-colors hover:bg-[#A8270B] disabled:opacity-60"
                  >
                    {busyId === s.id ? <Spinner /> : null} Renew 30 days
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {rows.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className={`${btnGhost} w-full`}>
              Show more ({rows.length - shown} left)
            </button>
          )}
        </>
      )}
    </div>
  );
}
