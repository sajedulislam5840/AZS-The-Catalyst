"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Ban, BookOpen, Flame, Pencil, RefreshCw, Trash2, Undo2 } from "lucide-react";
import api from "@/lib/api";
import { errorText, fmtDate, SUBJECT_COLOR, subjectLabel, timeAgo } from "./format";
import type { PaymentRow, StudentDetail } from "./types";
import { Bar, btnAccent, btnGhost, Card, inputClass, SectionTitle, Sheet, Skeleton, Spinner, StatusPill, useUi } from "./ui";

const PRESETS = [30, 60, 90];

interface Props {
  studentId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export default function StudentDrawer({ studentId, onClose, onChanged }: Props) {
  const { toast, confirm } = useUi();
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(!!studentId);
  const [error, setError] = useState<string | null>(null);

  const [days, setDays] = useState(30);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", school: "", grade_class: "", batch_no: "" });

  const fetchDetail = useCallback(async () => {
    try {
      const { data } = await api.get<StudentDetail>(`/api/v1/admin/students/${studentId}`);
      setDetail(data);
      setError(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  // Retry button: called from an event handler, so setting state first is fine.
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    // The parent remounts this component (key=studentId) per student, so state starts clean.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (studentId) void fetchDetail();
  }, [studentId, fetchDetail]);

  const refresh = async () => {
    await load();
    onChanged();
  };

  const renew = async () => {
    if (!detail) return;
    const s = detail.student;
    const ok = await confirm({
      title: `Add ${days} days for ${s.full_name}?`,
      message: "Confirm that you have received the cash. This is saved in the payment history.",
      confirmLabel: "Yes, cash received",
    });
    if (!ok) return;
    setBusy("renew");
    try {
      const body: { days: number; amount?: number; note?: string } = { days };
      if (amount.trim() !== "" && Number.isFinite(Number(amount))) body.amount = Math.max(0, Math.round(Number(amount)));
      if (note.trim()) body.note = note.trim();
      const { data } = await api.post(`/api/v1/admin/students/${s.id}/renew`, body);
      toast("success", `Active until ${fmtDate(data.subscription_end_date)}.`);
      setAmount("");
      setNote("");
      await refresh();
    } catch (err) {
      toast("error", errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const undo = async (p: PaymentRow) => {
    const ok = await confirm({
      title: "Undo this renewal?",
      message: `This takes back ${p.days_added} days and restores the previous end date (${fmtDate(p.previous_end)}).`,
      confirmLabel: "Undo renewal",
      danger: true,
    });
    if (!ok) return;
    setBusy(`undo-${p.id}`);
    try {
      await api.post(`/api/v1/admin/payments/${p.id}/undo`);
      toast("success", "Renewal undone.");
      await refresh();
    } catch (err) {
      toast("error", errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const revoke = async () => {
    if (!detail) return;
    const ok = await confirm({
      title: `Lock ${detail.student.full_name} out now?`,
      message: "They will see the renewal notice and cannot open anything until you renew them again.",
      confirmLabel: "Revoke access",
      danger: true,
    });
    if (!ok) return;
    setBusy("revoke");
    try {
      await api.post(`/api/v1/admin/students/${detail.student.id}/revoke-access`);
      toast("success", "Access revoked.");
      await refresh();
    } catch (err) {
      toast("error", errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!detail) return;
    const ok = await confirm({
      title: `Delete ${detail.student.full_name}?`,
      message: "Their account, progress, notes and payment history are removed for good. This cannot be undone.",
      confirmLabel: "Delete forever",
      danger: true,
    });
    if (!ok) return;
    setBusy("delete");
    try {
      await api.delete(`/api/v1/admin/students/${detail.student.id}`);
      toast("success", "Student deleted.");
      onChanged();
      onClose();
    } catch (err) {
      toast("error", errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const startEdit = () => {
    if (!detail) return;
    const s = detail.student;
    setForm({ full_name: s.full_name, school: s.school || "", grade_class: s.grade_class || "", batch_no: s.batch_no || "" });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!detail) return;
    if (!form.full_name.trim()) {
      toast("error", "Name cannot be empty.");
      return;
    }
    setBusy("edit");
    try {
      await api.patch(`/api/v1/admin/students/${detail.student.id}`, {
        full_name: form.full_name.trim(),
        school: form.school.trim(),
        grade_class: form.grade_class.trim(),
        batch_no: form.batch_no.trim(),
      });
      toast("success", "Details saved.");
      setEditing(false);
      await refresh();
    } catch (err) {
      toast("error", errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const s = detail?.student;
  const p = detail?.progress;

  return (
    <Sheet open={!!studentId} onClose={onClose} title={s?.full_name || "Student"}>
      {loading && !detail ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error && !detail ? (
        <Card className="text-center">
          <p className="text-sm font-semibold text-slate-600">{error}</p>
          <button type="button" onClick={() => void load()} className={`${btnGhost} mt-3`}>
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </Card>
      ) : s && p ? (
        <>
          {/* identity + subscription */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-600">{s.email}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[s.batch_no || "General", s.grade_class, s.school].filter(Boolean).join(" · ")}
                </p>
              </div>
              <StatusPill status={s.status} />
            </div>
            <p className="mt-3 rounded-xl bg-[#F3F8FC] px-3 py-2 text-sm font-semibold text-[#075985]">
              {s.status === "pending"
                ? "Has not paid yet. Locked out."
                : s.days_left > 0
                  ? `Active until ${fmtDate(s.subscription_end_date)} (${s.days_left} day${s.days_left === 1 ? "" : "s"} left)`
                  : `Ended on ${fmtDate(s.subscription_end_date)}. Locked out.`}
            </p>
          </Card>

          {/* renew */}
          <Card>
            <SectionTitle>Record cash payment</SectionTitle>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  aria-pressed={days === d}
                  className={`min-h-[44px] rounded-xl border text-sm font-bold transition-colors ${
                    days === d ? "border-[#075985] bg-[#075985] text-white" : "border-[#D3E3EF] bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-slate-500">
                Days
                <input type="number" inputMode="numeric" min={1} max={366} value={days} onChange={(e) => setDays(Math.min(366, Math.max(1, Number(e.target.value) || 1)))} className={`${inputClass} mt-1`} />
              </label>
              <label className="text-xs font-bold text-slate-500">
                Amount received (৳)
                <input type="number" inputMode="numeric" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="optional" className={`${inputClass} mt-1`} />
              </label>
            </div>
            <label className="mt-2 block text-xs font-bold text-slate-500">
              Note
              <input type="text" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional, e.g. paid to Sir at class" className={`${inputClass} mt-1`} />
            </label>
            <button type="button" onClick={() => void renew()} disabled={busy !== null} className={`${btnAccent} mt-3 w-full`}>
              {busy === "renew" ? <Spinner /> : null} Add {days} days
            </button>
            <p className="mt-2 text-[11px] text-slate-500">If the subscription is still running, the days are added after the current end date.</p>
          </Card>

          {/* progress */}
          <Card>
            <SectionTitle aside={<span className="text-sm font-black text-[#0F172A]">{p.percent}%</span>}>Progress</SectionTitle>
            <Bar percent={p.percent} height="h-3" color={p.percent >= 100 ? "#16A34A" : "#0369A1"} />
            <p className="mt-2 text-xs text-slate-500">
              {p.completed_lectures} of {p.total_lectures} published lectures finished · last active {timeAgo(p.last_active).toLowerCase()}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <MiniStat icon={<Flame className="h-4 w-4" />} value={p.streak} label="day streak" />
              <MiniStat icon={<BookOpen className="h-4 w-4" />} value={p.active_days_28} label="active days (28d)" />
              <MiniStat icon={<Pencil className="h-4 w-4" />} value={p.notes_count} label="notes" />
            </div>

            {p.activity_last_28.length > 0 && <ActivityStrip days={p.activity_last_28} />}

            {p.subjects.length === 0 ? (
              <p className="mt-4 text-center text-sm text-slate-500">No lectures are published yet.</p>
            ) : (
              <div className="mt-5 space-y-5">
                {p.subjects.map((sub) => (
                  <div key={sub.subject}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="font-extrabold text-[#0F172A]">{subjectLabel(sub.subject)}</span>
                      <span className="text-xs font-bold text-slate-500">
                        {sub.completed}/{sub.total} · {sub.percent}%
                      </span>
                    </div>
                    <Bar percent={sub.percent} color={SUBJECT_COLOR[sub.subject] || "#0369A1"} />
                    <ul className="mt-2 space-y-1.5">
                      {sub.chapters.map((c) => (
                        <li key={c.chapter} className="flex items-center gap-2 text-xs">
                          <span className="w-2/5 truncate text-slate-600" title={c.chapter}>
                            {c.chapter}
                          </span>
                          <div className="flex-1">
                            <Bar percent={c.percent} height="h-1.5" color={SUBJECT_COLOR[sub.subject] || "#0369A1"} />
                          </div>
                          <span className="w-10 shrink-0 text-right font-bold text-slate-600">
                            {c.completed}/{c.total}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {p.recent.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Recently watched</p>
                <ul className="divide-y divide-[#E2EDF5]">
                  {p.recent.map((r) => (
                    <li key={r.lecture_id} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#0F172A]">{r.title}</p>
                        <p className="truncate text-[11px] text-slate-500">
                          {subjectLabel(r.subject)} · {r.chapter} · {timeAgo(r.updated_at).toLowerCase()}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${r.completed ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>
                        {r.completed ? "Done" : `${r.watched_percent}%`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* payments */}
          <Card>
            <SectionTitle>Payment history</SectionTitle>
            {detail.payments.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-500">No payment recorded yet.</p>
            ) : (
              <ul className="divide-y divide-[#E2EDF5]">
                {detail.payments.map((pay) => (
                  <li key={pay.id} className={`flex items-start gap-3 py-3 ${pay.voided ? "opacity-50" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold text-[#0F172A] ${pay.voided ? "line-through" : ""}`}>
                        +{pay.days_added} days{pay.amount != null ? ` · ৳${pay.amount.toLocaleString("en-US")}` : ""}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {fmtDate(pay.created_at)} · until {fmtDate(pay.new_end)}
                        {pay.voided ? " · undone" : ""}
                      </p>
                      {pay.note && <p className="mt-0.5 text-[11px] italic text-slate-500">{pay.note}</p>}
                    </div>
                    {pay.can_undo && (
                      <button type="button" onClick={() => void undo(pay)} disabled={busy !== null} className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-[#D3E3EF] px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                        {busy === `undo-${pay.id}` ? <Spinner /> : <Undo2 className="h-4 w-4" />} Undo
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* edit + danger */}
          <Card>
            <SectionTitle
              aside={
                !editing ? (
                  <button type="button" onClick={startEdit} className="inline-flex min-h-[44px] items-center gap-1.5 px-2 text-xs font-bold text-[#075985] hover:underline">
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                ) : null
              }
            >
              Details
            </SectionTitle>
            {editing ? (
              <div className="space-y-2">
                {(
                  [
                    ["full_name", "Full name"],
                    ["school", "School"],
                    ["grade_class", "Class"],
                    ["batch_no", "Batch"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block text-xs font-bold text-slate-500">
                    {label}
                    <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className={`${inputClass} mt-1`} />
                  </label>
                ))}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setEditing(false)} className={`${btnGhost} flex-1`}>
                    Cancel
                  </button>
                  <button type="button" onClick={() => void saveEdit()} disabled={busy !== null} className={`${btnAccent} flex-1`}>
                    {busy === "edit" ? <Spinner /> : null} Save
                  </button>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <Row k="Batch" v={s.batch_no} />
                <Row k="Class" v={s.grade_class} />
                <Row k="School" v={s.school} />
                <Row k="Joined" v={fmtDate(s.created_at)} />
              </dl>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#E2EDF5] pt-4">
              <button type="button" onClick={() => void revoke()} disabled={busy !== null || s.status === "pending"} className={`${btnGhost} text-amber-700`}>
                {busy === "revoke" ? <Spinner /> : <Ban className="h-4 w-4" />} Revoke access
              </button>
              <button type="button" onClick={() => void remove()} disabled={busy !== null} className={`${btnGhost} text-rose-700`}>
                {busy === "delete" ? <Spinner /> : <Trash2 className="h-4 w-4" />} Delete
              </button>
            </div>
          </Card>
        </>
      ) : null}
    </Sheet>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{k}</dt>
      <dd className="truncate font-semibold text-[#0F172A]">{v || "-"}</dd>
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-xl bg-[#F3F8FC] px-2 py-2.5">
      <div className="flex items-center justify-center gap-1 text-[#075985]">
        {icon}
        <span className="text-lg font-black text-[#0F172A]">{value}</span>
      </div>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

/** 28 small squares, oldest first. `days` holds the active dates as YYYY-MM-DD. */
function ActivityStrip({ days }: { days: string[] }) {
  const active = new Set(days.map((d) => d.slice(0, 10)));
  const cells: { key: string; on: boolean }[] = [];
  const today = new Date();
  for (let i = 27; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    cells.push({ key, on: active.has(key) });
  }
  return (
    <div className="mt-4" aria-label="Activity in the last 28 days">
      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
        {cells.map((c) => (
          <span key={c.key} title={c.key} className={`aspect-square rounded-[4px] ${c.on ? "bg-[#0369A1]" : "bg-[#E2EDF5]"}`} />
        ))}
      </div>
      <p className="mt-1 text-[10px] font-semibold text-slate-400">Last 28 days, newest on the right</p>
    </div>
  );
}
