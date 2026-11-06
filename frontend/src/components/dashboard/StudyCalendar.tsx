"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, RefreshCw, Trash2 } from "lucide-react";
import { addDays, type Plan } from "@/lib/progress";
import Sheet from "./Sheet";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");

interface CalendarProps {
  plans: Plan[];
  today: string;
  onPick: (dateKey: string) => void;
}

export function StudyCalendar({ plans, today, onPick }: CalendarProps) {
  const [ty, tm] = today.split("-").map(Number);
  const [cursor, setCursor] = useState({ y: ty, m: tm - 1 });

  const byDay = useMemo(() => {
    const map = new Map<string, { manual: number; auto: number }>();
    for (const p of plans) {
      const e = map.get(p.dateKey) ?? { manual: 0, auto: 0 };
      if (p.source === "auto") e.auto += 1;
      else e.manual += 1;
      map.set(p.dateKey, e);
    }
    return map;
  }, [plans]);

  const first = new Date(cursor.y, cursor.m, 1).getDay();
  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const move = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <section className="dash-card space-y-3 p-5" aria-label="Study planner">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-[#075985]">
          {MONTHS[cursor.m]} {cursor.y}
        </h3>
        <div className="flex gap-1">
          <button type="button" onClick={() => move(-1)} aria-label="Previous month" className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D3E3EF] text-slate-600 active:bg-slate-100">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => move(1)} aria-label="Next month" className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D3E3EF] text-slate-600 active:bg-slate-100">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-slate-400" aria-hidden="true">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs font-semibold">
        {Array.from({ length: first }, (_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const n = i + 1;
          const key = `${cursor.y}-${pad(cursor.m + 1)}-${pad(n)}`;
          const info = byDay.get(key);
          const isToday = key === today;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              aria-label={`${n} ${MONTHS[cursor.m]}${isToday ? ", today" : ""}${info ? `, ${info.manual + info.auto} task${info.manual + info.auto === 1 ? "" : "s"}` : ""}`}
              className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition active:scale-90 ${
                isToday ? "bg-[#075985] text-white shadow-md" : key < today ? "text-slate-400 hover:bg-slate-100" : "text-slate-700 hover:bg-sky-50"
              }`}
            >
              {n}
              {info && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {info.manual > 0 && <span className={`h-1.5 w-1.5 rounded-full ${isToday ? "bg-white" : "bg-[#0369A1]"}`} />}
                  {info.auto > 0 && <span className={`h-1.5 w-1.5 rounded-full ${isToday ? "bg-amber-300" : "bg-[#CC310E]"}`} />}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#0369A1]" /> Your task</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#CC310E]" /> Auto revision</span>
      </p>
    </section>
  );
}

interface TodayProps {
  plans: Plan[];
  today: string;
  onOpenPlan: (plan: Plan) => void;
}

/** What is due today and what is overdue (the last three days), with revision reminders opening their lecture. */
export function DueToday({ plans, today, onOpenPlan }: TodayProps) {
  const from = addDays(today, -3);
  const due = plans.filter((p) => p.dateKey === today);
  const overdue = plans.filter((p) => p.dateKey < today && p.dateKey >= from && p.source === "auto");
  if (due.length === 0 && overdue.length === 0) return null;
  const row = (p: Plan, late: boolean) => (
    <li key={p.id}>
      <button type="button" onClick={() => onOpenPlan(p)} className="flex min-h-[48px] w-full items-center gap-3 rounded-xl bg-[#F3F8FC] px-3 py-2 text-left active:bg-sky-100">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${p.source === "auto" ? "bg-[#FDE2D9] text-[#CC310E]" : "bg-sky-100 text-[#0369A1]"}`}>
          {p.source === "auto" ? <RefreshCw className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-slate-900">{p.title}</span>
          <span className="block text-[10px] font-semibold text-slate-500">{late ? "Overdue" : p.time || "Today"}</span>
        </span>
      </button>
    </li>
  );
  return (
    <section className="dash-card p-5" aria-label="Due today">
      <h3 className="mb-3 text-sm font-black text-[#075985]">Due today</h3>
      <ul className="space-y-2">
        {due.map((p) => row(p, false))}
        {overdue.map((p) => row(p, true))}
      </ul>
    </section>
  );
}

interface DayProps {
  dateKey: string;
  plans: Plan[];
  onAdd: (dateKey: string, title: string, time?: string) => void;
  onRemove: (id: string) => void;
  onOpenPlan: (plan: Plan) => void;
  onClose: () => void;
}

export function DayPlanSheet({ dateKey, plans, onAdd, onRemove, onOpenPlan, onClose }: DayProps) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const list = plans.filter((p) => p.dateKey === dateKey);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(dateKey, title, time);
    setTitle("");
    setTime("");
  };

  return (
    <Sheet title={`Study planner: ${dateKey}`} onClose={onClose}>
      <div className="space-y-4 p-5">
        {list.length === 0 ? (
          <p className="rounded-xl border border-[#D3E3EF] bg-[#F3F8FC] py-5 text-center text-xs text-slate-500">Nothing planned for this day yet.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-xl border border-[#D3E3EF] bg-[#F3F8FC] p-2.5">
                <button type="button" onClick={() => onOpenPlan(p)} className="min-h-[44px] min-w-0 flex-1 px-1 text-left">
                  <span className="block truncate text-xs font-bold text-slate-900">{p.title}</span>
                  <span className="block text-[10px] font-semibold text-[#0369A1]">{p.source === "auto" ? "Auto revision. Tap to open the lecture." : p.time}</span>
                </button>
                <button type="button" onClick={() => onRemove(p.id)} aria-label={`Delete ${p.title}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-rose-600 active:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={submit} className="space-y-3 border-t border-[#D3E3EF] pt-4">
          <input
            type="text"
            required
            maxLength={200}
            placeholder="Task (e.g. Physics CQ revision)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-12 w-full rounded-xl border border-[#D3E3EF] bg-[#F3F8FC] px-4 text-sm text-slate-900 outline-none focus:border-[#0369A1] focus:ring-2 focus:ring-[#0369A1]/20"
          />
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={40}
              placeholder="Time (e.g. 8:00 PM)"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-12 min-w-0 flex-1 rounded-xl border border-[#D3E3EF] bg-[#F3F8FC] px-4 text-sm text-slate-900 outline-none focus:border-[#0369A1] focus:ring-2 focus:ring-[#0369A1]/20"
            />
            <button type="submit" className="h-12 shrink-0 rounded-xl bg-[#CC310E] px-5 text-sm font-extrabold text-white active:scale-95">
              Add
            </button>
          </div>
        </form>
      </div>
    </Sheet>
  );
}
