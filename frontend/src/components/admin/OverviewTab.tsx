"use client";

import React from "react";
import { AlertTriangle, BrainCircuit, CheckCircle2, FileText, GraduationCap, Hourglass, Video, Wallet } from "lucide-react";
import { STATUS_META, subjectLabel } from "./format";
import type { Overview, SubStatus } from "./types";
import { btnGhost, Card, Skeleton, SectionTitle, StatusPill } from "./ui";

const ORDER: SubStatus[] = ["active", "expiring", "expired", "pending"];

const REASON_TEXT = {
  expiring: (d: number) => (d <= 1 ? "Ends today or tomorrow" : `${d} days left`),
  recently_expired: () => "Expired in the last 2 weeks",
  new_unpaid: () => "New sign-up, not paid yet",
} as const;

interface Props {
  data: Overview | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenStudent: (id: string) => void;
  onFilter: (status: SubStatus | "ALL") => void;
  onTab: (tab: "lectures" | "materials" | "payments") => void;
}

export default function OverviewTab({ data, loading, error, onRetry, onOpenStudent, onFilter, onTab }: Props) {
  if (loading && !data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (!data) {
    return (
      <Card className="text-center">
        <p className="text-sm font-semibold text-slate-600">{error || "Could not load the overview."}</p>
        <button type="button" onClick={onRetry} className={`${btnGhost} mt-3`}>
          Try again
        </button>
      </Card>
    );
  }

  const t = data.totals;
  const total = t.students;
  const pct = (n: number) => (total ? Math.round((100 * n) / total) : 0);
  const needPayment = t.expired + t.pending;

  return (
    <div className="space-y-4">
      {/* ---- the subscription bar ---- */}
      <Card>
        <SectionTitle aside={<span className="text-xs font-semibold text-slate-500">{total} students</span>}>Subscriptions</SectionTitle>
        {total === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No students yet. They show up here as soon as they register.</p>
        ) : (
          <>
            <div className="flex h-5 w-full overflow-hidden rounded-full bg-[#E2EDF5]" role="img" aria-label={ORDER.map((s) => `${STATUS_META[s].label} ${t[s]}`).join(", ")}>
              {ORDER.map((s) =>
                t[s] > 0 ? (
                  <button
                    key={s}
                    type="button"
                    title={`${STATUS_META[s].label}: ${t[s]}`}
                    aria-label={`Show ${STATUS_META[s].label} students`}
                    onClick={() => onFilter(s)}
                    className="h-full transition-[width] duration-500 hover:opacity-80"
                    style={{ width: `${(100 * t[s]) / total}%`, backgroundColor: STATUS_META[s].bar }}
                  />
                ) : null
              )}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {ORDER.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => onFilter(s)}
                    className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-[#E2EDF5] bg-[#F8FBFD] px-3 py-2 text-left transition-colors hover:border-[#0369A1]"
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: STATUS_META[s].bar }} />
                    <span className="min-w-0">
                      <span className="block text-lg font-black leading-none text-[#0F172A]">
                        {t[s]} <span className="text-xs font-bold text-slate-500">· {pct(t[s])}%</span>
                      </span>
                      <span className="mt-1 block truncate text-[11px] font-bold uppercase tracking-wide text-slate-500">{STATUS_META[s].label}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {/* ---- key numbers ---- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<GraduationCap className="h-5 w-5" />} label="Total students" value={total} note={`${data.new_this_week} new this week`} onClick={() => onFilter("ALL")} />
        <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Paid right now" value={t.paid_now} note={`${pct(t.paid_now)}% of students`} tone="sky" onClick={() => onFilter("active")} />
        <Stat icon={<Hourglass className="h-5 w-5" />} label="Ending in 7 days" value={t.expiring} note="Warned automatically" tone={t.expiring ? "amber" : "slate"} onClick={() => onFilter("expiring")} />
        <Stat icon={<AlertTriangle className="h-5 w-5" />} label="Need to pay" value={needPayment} note="Locked out until renewed" tone={needPayment ? "red" : "slate"} onClick={() => onFilter(t.expired ? "expired" : "pending")} />
      </div>

      {/* ---- who needs a call ---- */}
      <Card>
        <SectionTitle>Needs your attention</SectionTitle>
        {data.attention.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">Nobody needs attention right now. 🎉</p>
        ) : (
          <ul className="divide-y divide-[#E2EDF5]">
            {data.attention.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => onOpenStudent(a.id)} className="block max-w-full truncate text-left text-sm font-extrabold text-[#075985] hover:underline">
                    {a.full_name}
                  </button>
                  <p className="truncate text-xs text-slate-500">
                    {a.batch_no} · {REASON_TEXT[a.reason](a.days_left)}
                  </p>
                </div>
                <StatusPill status={a.status} small />
                <button type="button" onClick={() => onOpenStudent(a.id)} className="min-h-[44px] shrink-0 rounded-xl bg-[#CC310E] px-3 text-xs font-bold text-white hover:bg-[#A8270B]">
                  Renew
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ---- batches ---- */}
      {data.batches.length > 0 && (
        <Card>
          <SectionTitle>By batch</SectionTitle>
          <ul className="space-y-3">
            {data.batches.map((b) => (
              <li key={b.batch}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-bold text-[#0F172A]">{b.batch}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {b.paid} paid · {b.expired} expired · {b.pending} not paid
                  </span>
                </div>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#E2EDF5]">
                  <div style={{ width: `${(100 * b.paid) / b.total}%`, backgroundColor: STATUS_META.active.bar }} />
                  <div style={{ width: `${(100 * b.expired) / b.total}%`, backgroundColor: STATUS_META.expired.bar }} />
                  <div style={{ width: `${(100 * b.pending) / b.total}%`, backgroundColor: STATUS_META.pending.bar }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ---- the rest of the platform ---- */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniCard icon={<Video className="h-5 w-5" />} title="Lectures" onClick={() => onTab("lectures")}>
          <b>{data.lectures.published}</b> live{data.lectures.total > data.lectures.published ? ` · ${data.lectures.total - data.lectures.published} hidden` : ""}
          <Subjects counts={data.lectures.by_subject} />
        </MiniCard>
        <MiniCard icon={<FileText className="h-5 w-5" />} title="Study sheets" onClick={() => onTab("materials")}>
          <b>{data.materials.published}</b> live{data.materials.total > data.materials.published ? ` · ${data.materials.total - data.materials.published} hidden` : ""}
          <Subjects counts={data.materials.by_subject} />
        </MiniCard>
        <MiniCard icon={<BrainCircuit className="h-5 w-5" />} title="AI tutor, last 7 days">
          <b>{data.ai.messages_7d}</b> questions
          <span className="block text-xs text-slate-500">from {data.ai.students_7d} students</span>
        </MiniCard>
      </div>

      {data.collected_this_month.amounts_recorded > 0 && (
        <MiniCard icon={<Wallet className="h-5 w-5" />} title="Cash recorded this month" onClick={() => onTab("payments")}>
          <b>৳{data.collected_this_month.amount.toLocaleString("en-US")}</b>
          <span className="block text-xs text-slate-500">
            from {data.collected_this_month.payments} renewals ({data.collected_this_month.amounts_recorded} with an amount entered)
          </span>
        </MiniCard>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  note,
  tone = "slate",
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  note: string;
  tone?: "slate" | "sky" | "amber" | "red";
  onClick?: () => void;
}) {
  const tones = {
    slate: "bg-slate-50 text-slate-600 border-slate-200",
    sky: "bg-sky-50 text-sky-700 border-sky-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-rose-50 text-[#CC310E] border-rose-200",
  };
  return (
    <button type="button" onClick={onClick} className="flex min-h-[96px] items-center justify-between gap-3 rounded-2xl border border-[#D3E3EF] bg-white p-4 text-left shadow-sm transition-colors hover:border-[#0369A1]">
      <span className="min-w-0">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="mt-1 block text-3xl font-black leading-none text-[#0F172A]">{value}</span>
        <span className="mt-1 block truncate text-[11px] text-slate-500">{note}</span>
      </span>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}>{icon}</span>
    </button>
  );
}

function MiniCard({ icon, title, children, onClick }: { icon: React.ReactNode; title: string; children: React.ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">{icon}</span>
      <span className="min-w-0 text-sm text-[#0F172A]">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</span>
        {children}
      </span>
    </>
  );
  const cls = "flex items-center gap-3 rounded-2xl border border-[#D3E3EF] bg-white p-4 text-left shadow-sm";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} transition-colors hover:border-[#0369A1]`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Subjects({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  return (
    <span className="mt-0.5 block text-xs text-slate-500">
      {entries.map(([s, n]) => `${subjectLabel(s)} ${n}`).join(" · ")}
    </span>
  );
}
