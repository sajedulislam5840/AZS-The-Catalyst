"use client";

import React, { useMemo, useState } from "react";
import { CheckSquare, RefreshCw, Search, Square, X } from "lucide-react";
import api from "@/lib/api";
import { errorText, fmtDate, initials, STATUS_META, timeAgo } from "./format";
import type { BulkRenewResult, Student, SubStatus } from "./types";
import { Bar, btnAccent, btnGhost, btnPrimary, Card, inputClass, Modal, Skeleton, Spinner, StatusPill, useUi } from "./ui";

type Filter = SubStatus | "ALL";
type Sort = "newest" | "name" | "days" | "progress";

const PAGE = 40;
const BULK_DAYS = [30, 60, 90];

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

  // Bulk renewal: tick several students, then renew them together.
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkDays, setBulkDays] = useState(30);
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkFailed, setBulkFailed] = useState<BulkRenewResult["failed"]>([]);

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

  const togglePick = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const stopSelecting = () => {
    setSelecting(false);
    setPicked(new Set());
    setBulkAmount("");
  };

  const allPicked = rows.length > 0 && rows.every((s) => picked.has(s.id));

  const bulkRenew = async () => {
    const ids = Array.from(picked);
    if (ids.length === 0) return;
    const amount = bulkAmount.trim() !== "" && Number.isFinite(Number(bulkAmount)) ? Math.max(0, Math.round(Number(bulkAmount))) : undefined;
    const ok = await confirm({
      title: `Renew ${ids.length} ${ids.length === 1 ? "student" : "students"} for ${bulkDays} days?`,
      message: `Only do this after you have received the cash from every one of them${amount !== undefined ? ` (৳${amount.toLocaleString("en-US")} each)` : ""}. Each renewal is saved in that student's payment history and can be undone there.`,
      confirmLabel: "Yes, cash received",
    });
    if (!ok) return;
    setBulkBusy(true);
    try {
      const body: { student_ids: string[]; days: number; amount?: number } = { student_ids: ids, days: bulkDays };
      if (amount !== undefined) body.amount = amount;
      const { data } = await api.post<BulkRenewResult>("/api/v1/admin/students/bulk-renew", body);
      if (data.renewed.length) toast("success", `Renewed ${data.renewed.length} ${data.renewed.length === 1 ? "student" : "students"} for ${bulkDays} days.`);
      setBulkFailed(data.failed);
      stopSelecting();
      onChanged();
    } catch (err) {
      toast("error", errorText(err));
    } finally {
      setBulkBusy(false);
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
        {selecting ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPicked(allPicked ? new Set() : new Set(rows.map((s) => s.id)))} disabled={rows.length === 0} className={btnGhost}>
              {allPicked ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />} {allPicked ? "Clear all" : `Select all ${rows.length}`}
            </button>
            <button type="button" onClick={stopSelecting} className={btnGhost}>
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setSelecting(true)} disabled={students.length === 0} className={`${btnGhost} w-full`}>
            <CheckSquare className="h-4 w-4" /> Renew many students at once
          </button>
        )}
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
            {rows.length} {rows.length === 1 ? "student" : "students"}. {selecting ? "Tap the students who paid." : "Tap a name to see their progress."}
          </p>
          <ul className={`space-y-3 ${selecting ? "pb-44" : ""}`}>
            {rows.slice(0, shown).map((s) => {
              const on = picked.has(s.id);
              return (
              <li
                key={s.id}
                onClick={selecting ? () => togglePick(s.id) : undefined}
                className={`rounded-2xl border bg-white p-3 shadow-sm transition-colors sm:p-4 ${selecting ? "cursor-pointer select-none" : ""} ${
                  on ? "border-[#075985] ring-2 ring-sky-200" : "border-[#D3E3EF]"
                }`}
              >
                <div className="flex items-start gap-3">
                  {selecting ? (
                    <span
                      role="checkbox"
                      aria-checked={on}
                      aria-label={`Select ${s.full_name}`}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          togglePick(s.id);
                        }
                      }}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-[#075985] bg-[#075985] text-white" : "border-[#D3E3EF] bg-white text-transparent"}`}
                    >
                      <CheckSquare className="h-5 w-5" />
                    </span>
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-black text-[#075985]" aria-hidden="true">
                      {initials(s.full_name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {selecting ? (
                      <p className="truncate text-[15px] font-extrabold text-[#075985]">{s.full_name}</p>
                    ) : (
                      <button type="button" onClick={() => onOpen(s.id)} className="block max-w-full truncate text-left text-[15px] font-extrabold text-[#075985] hover:underline">
                        {s.full_name}
                      </button>
                    )}
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
                {!selecting && (
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
                )}
              </li>
              );
            })}
          </ul>
          {rows.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className={`${btnGhost} w-full`}>
              Show more ({rows.length - shown} left)
            </button>
          )}
        </>
      )}

      {selecting && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#D3E3EF] bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur">
          <div className="mx-auto max-w-5xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-[#0F172A]">{picked.size} selected</span>
              <div className="ml-auto flex gap-1" role="radiogroup" aria-label="Days to add">
                {BULK_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={bulkDays === d}
                    onClick={() => setBulkDays(d)}
                    className={`min-h-[40px] rounded-lg border px-3 text-xs font-bold ${bulkDays === d ? "border-[#075985] bg-[#075985] text-white" : "border-[#D3E3EF] bg-white text-slate-700"}`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                placeholder="৳ each (optional)"
                aria-label="Amount each student paid, optional"
                className={inputClass}
              />
              <button type="button" onClick={() => void bulkRenew()} disabled={picked.size === 0 || bulkBusy} className={btnAccent}>
                {bulkBusy ? <Spinner /> : null} Renew {picked.size || ""}
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal open={bulkFailed.length > 0} onClose={() => setBulkFailed([])} title={`${bulkFailed.length} not renewed`}>
        <ul className="space-y-2">
          {bulkFailed.map((f) => (
            <li key={f.id} className="rounded-xl border border-[#D3E3EF] bg-[#F3F8FC] p-3">
              <p className="text-sm font-extrabold text-[#0F172A]">{f.full_name || "Unknown student"}</p>
              <p className="text-xs text-slate-600">{f.reason}</p>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setBulkFailed([])} className={`${btnPrimary} mt-4 w-full`}>OK</button>
      </Modal>
    </div>
  );
}
