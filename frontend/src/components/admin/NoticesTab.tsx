"use client";

import React, { useState } from "react";
import { Megaphone, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { errorText, fmtDate } from "./format";
import type { NoticeRow } from "./types";
import { btnAccent, btnGhost, Card, inputClass, SectionTitle, Skeleton, Spinner, useUi } from "./ui";

const MAX = 500;

interface Props {
  notices: NoticeRow[];
  loading: boolean;
  error: string | null;
  onChanged: () => void;
  onRetry: () => void;
}

export default function NoticesTab({ notices, loading, error, onChanged, onRetry }: Props) {
  const { toast, confirm } = useUi();
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const post = async () => {
    const content = text.trim();
    if (!content) return;
    setPosting(true);
    try {
      await api.post("/api/v1/admin/notices", { content });
      toast("success", "Notice posted. Students see the newest one.");
      setText("");
      onChanged();
    } catch (err) {
      toast("error", errorText(err));
    } finally {
      setPosting(false);
    }
  };

  const remove = async (n: NoticeRow) => {
    const ok = await confirm({ title: "Delete this notice?", message: "Students will stop seeing it.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    setBusyId(n.id);
    try {
      await api.delete(`/api/v1/admin/notices/${n.id}`);
      toast("success", "Notice deleted.");
      onChanged();
    } catch (err) {
      toast("error", errorText(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle aside={<span className={`text-xs font-bold ${text.length > MAX - 40 ? "text-[#CC310E]" : "text-slate-400"}`}>{text.length}/{MAX}</span>}>New notice</SectionTitle>
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, MAX))} rows={4} placeholder="Write a short message for all students" aria-label="Notice text" className={`${inputClass} py-2`} />
        <button type="button" onClick={() => void post()} disabled={posting || !text.trim()} className={`${btnAccent} mt-3 w-full`}>
          {posting ? <Spinner /> : <Megaphone className="h-4 w-4" />} Post notice
        </button>
        <p className="mt-2 text-[11px] text-slate-500">Only the newest notice is shown to paying students. Unpaid students see the renewal message instead.</p>
      </Card>

      {loading && notices.length === 0 ? (
        <Skeleton className="h-20 w-full" />
      ) : error && notices.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm font-semibold text-slate-600">{error}</p>
          <button type="button" onClick={onRetry} className={`${btnGhost} mt-3`}>Try again</button>
        </Card>
      ) : notices.length === 0 ? (
        <Card className="py-8 text-center text-sm text-slate-500">No notices yet.</Card>
      ) : (
        <ul className="space-y-2">
          {notices.map((n, i) => (
            <li key={n.id} className="flex items-start gap-3 rounded-2xl border border-[#D3E3EF] bg-white p-3 shadow-sm">
              <div className="min-w-0 flex-1">
                {i === 0 && <span className="mb-1 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">Showing now</span>}
                <p className="whitespace-pre-wrap break-words text-sm text-[#0F172A]">{n.content}</p>
                <p className="mt-1 text-[11px] text-slate-500">{fmtDate(n.created_at)}</p>
              </div>
              <button type="button" aria-label="Delete notice" disabled={busyId === n.id} onClick={() => void remove(n)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                {busyId === n.id ? <Spinner /> : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
