"use client";

import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, ListOrdered, Pencil, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { errorText, SUBJECT_COLOR, subjectLabel, youtubeId } from "./format";
import type { Lecture } from "./types";
import { btnAccent, btnGhost, btnPrimary, Card, inputClass, Modal, Skeleton, Spinner, useUi } from "./ui";

const SUBJECTS = ["PHYSICS", "CHEMISTRY", "HIGHER_MATH"];

interface Draft {
  id: string | null;
  lecture_no: string;
  title: string;
  chapter: string;
  subject: string;
  video_url: string;
}
const blank = (subject = "PHYSICS", chapter = ""): Draft => ({ id: null, lecture_no: "", title: "", chapter, subject, video_url: "" });

interface Props {
  lectures: Lecture[];
  loading: boolean;
  error: string | null;
  onChanged: () => void;
  onRetry: () => void;
}

export default function LecturesTab({ lectures, loading, error, onChanged, onRetry }: Props) {
  const { toast, confirm } = useUi();
  const [subject, setSubject] = useState("ALL");
  const [chapter, setChapter] = useState("ALL");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const chapters = useMemo(
    () => Array.from(new Set(lectures.filter((l) => subject === "ALL" || l.subject === subject).map((l) => l.chapter))).sort(),
    [lectures, subject]
  );

  const rows = useMemo(
    () =>
      lectures
        .filter((l) => (subject === "ALL" || l.subject === subject) && (chapter === "ALL" || l.chapter === chapter))
        .sort((a, b) => a.subject.localeCompare(b.subject) || a.chapter.localeCompare(b.chapter) || a.lecture_no - b.lecture_no),
    [lectures, subject, chapter]
  );

  const run = async (id: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusyId(id);
    try {
      await fn();
      if (ok) toast("success", ok);
      onChanged();
    } catch (err) {
      toast("error", errorText(err));
    } finally {
      setBusyId(null);
    }
  };

  const togglePublish = (l: Lecture) =>
    run(l.id, () => api.patch(`/api/v1/admin/lectures/${l.id}/toggle-publish`), l.is_published ? "Hidden from students." : "Now visible to students.");

  const remove = async (l: Lecture) => {
    const ok = await confirm({
      title: "Delete this lecture?",
      message: `"${l.title}" and every student's progress on it will be removed.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) await run(l.id, () => api.delete(`/api/v1/admin/lectures/${l.id}`), "Lecture deleted.");
  };

  const move = (a: Lecture, b: Lecture | undefined) => {
    if (!b) return;
    void run(a.id, () => api.post("/api/v1/admin/lectures/swap-order", { lecture_id_1: a.id, lecture_id_2: b.id }));
  };

  const renumber = async () => {
    if (subject === "ALL" || chapter === "ALL") return;
    const ok = await confirm({
      title: "Renumber this chapter?",
      message: `Lectures in "${chapter}" will be numbered 1, 2, 3... in their current order.`,
      confirmLabel: "Renumber",
    });
    if (ok) await run("renumber", () => api.post("/api/v1/admin/lectures/normalize-order", { subject, chapter }), "Chapter renumbered.");
  };

  const save = async () => {
    if (!draft) return;
    const title = draft.title.trim();
    const ch = draft.chapter.trim();
    const no = Number(draft.lecture_no);
    if (!title || !ch) return toast("error", "Title and chapter are required.");
    if (!Number.isInteger(no) || no < 1) return toast("error", "Lecture number must be 1 or more.");
    if (!youtubeId(draft.video_url)) return toast("error", "Paste a valid YouTube link (youtube.com or youtu.be).");
    const body = { lecture_no: no, title, topic: title, chapter: ch, subject: draft.subject, video_url: draft.video_url.trim() };
    setSaving(true);
    try {
      if (draft.id) await api.put(`/api/v1/admin/lectures/${draft.id}`, body);
      else await api.post("/api/v1/admin/lectures", body);
      toast("success", draft.id ? "Lecture updated." : "Lecture added. Publish it when ready.");
      setDraft(null);
      onChanged();
    } catch (err) {
      toast("error", errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const openNew = () => {
    const inChapter = lectures.filter((l) => l.subject === (subject === "ALL" ? "PHYSICS" : subject) && l.chapter === chapter);
    const next = inChapter.length ? Math.max(...inChapter.map((l) => l.lecture_no)) + 1 : 1;
    setDraft({ ...blank(subject === "ALL" ? "PHYSICS" : subject, chapter === "ALL" ? "" : chapter), lecture_no: String(next) });
  };

  const vid = draft ? youtubeId(draft.video_url) : null;

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <select value={subject} onChange={(e) => { setSubject(e.target.value); setChapter("ALL"); }} aria-label="Subject" className={inputClass}>
            <option value="ALL">All subjects</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{subjectLabel(s)}</option>
            ))}
          </select>
          <select value={chapter} onChange={(e) => setChapter(e.target.value)} aria-label="Chapter" className={inputClass}>
            <option value="ALL">All chapters</option>
            {chapters.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={openNew} className={btnAccent}>
            <Plus className="h-4 w-4" /> Add lecture
          </button>
          <button type="button" onClick={() => void renumber()} disabled={subject === "ALL" || chapter === "ALL" || busyId === "renumber"} className={btnGhost} title="Pick a subject and a chapter first">
            {busyId === "renumber" ? <Spinner /> : <ListOrdered className="h-4 w-4" />} Renumber
          </button>
        </div>
      </Card>

      {loading && lectures.length === 0 ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : error && lectures.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm font-semibold text-slate-600">{error}</p>
          <button type="button" onClick={onRetry} className={`${btnGhost} mt-3`}>Try again</button>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="py-10 text-center text-sm text-slate-500">{lectures.length === 0 ? "No lectures yet. Add the first one." : "No lectures match this filter."}</Card>
      ) : (
        <ul className="space-y-2">
          {rows.map((l, i) => {
            const prev = rows[i - 1] && rows[i - 1].subject === l.subject && rows[i - 1].chapter === l.chapter ? rows[i - 1] : undefined;
            const next = rows[i + 1] && rows[i + 1].subject === l.subject && rows[i + 1].chapter === l.chapter ? rows[i + 1] : undefined;
            const busy = busyId === l.id;
            return (
              <li key={l.id} className={`rounded-2xl border border-[#D3E3EF] bg-white p-3 shadow-sm ${l.is_published ? "" : "opacity-70"}`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white" style={{ backgroundColor: SUBJECT_COLOR[l.subject] || "#0369A1" }}>
                    {l.lecture_no}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#0F172A]">{l.title}</p>
                    <p className="truncate text-[11px] text-slate-500">{subjectLabel(l.subject)} · {l.chapter}</p>
                    {!l.is_published && <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">Hidden from students</span>}
                  </div>
                  <div className="flex shrink-0 flex-col">
                    <IconBtn label="Move up" disabled={!prev || busy} onClick={() => move(l, prev)}><ArrowUp className="h-4 w-4" /></IconBtn>
                    <IconBtn label="Move down" disabled={!next || busy} onClick={() => move(l, next)}><ArrowDown className="h-4 w-4" /></IconBtn>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => void togglePublish(l)} disabled={busy} className={`${btnGhost} !min-h-[44px] text-xs`}>
                    {busy ? <Spinner /> : l.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {l.is_published ? "Hide" : "Publish"}
                  </button>
                  <button type="button" onClick={() => setDraft({ id: l.id, lecture_no: String(l.lecture_no), title: l.title, chapter: l.chapter, subject: l.subject, video_url: l.video_url })} className={`${btnGhost} !min-h-[44px] text-xs`}>
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  <button type="button" onClick={() => void remove(l)} disabled={busy} className={`${btnGhost} !min-h-[44px] text-xs text-rose-700`}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={!!draft} onClose={() => !saving && setDraft(null)} title={draft?.id ? "Edit lecture" : "Add lecture"}>
        {draft && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-slate-500">Subject
                <select value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className={`${inputClass} mt-1`}>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{subjectLabel(s)}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-500">Lecture no.
                <input type="number" inputMode="numeric" min={1} value={draft.lecture_no} onChange={(e) => setDraft({ ...draft, lecture_no: e.target.value })} className={`${inputClass} mt-1`} />
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-500">Chapter
              <input list="chapter-options" value={draft.chapter} onChange={(e) => setDraft({ ...draft, chapter: e.target.value })} className={`${inputClass} mt-1`} />
              <datalist id="chapter-options">
                {Array.from(new Set(lectures.filter((l) => l.subject === draft.subject).map((l) => l.chapter))).map((c) => <option key={c} value={c} />)}
              </datalist>
            </label>
            <label className="block text-xs font-bold text-slate-500">Title
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={`${inputClass} mt-1`} />
            </label>
            <label className="block text-xs font-bold text-slate-500">YouTube link
              <input type="url" inputMode="url" value={draft.video_url} onChange={(e) => setDraft({ ...draft, video_url: e.target.value })} placeholder="https://youtu.be/..." className={`${inputClass} mt-1`} />
            </label>
            {draft.video_url.trim() !== "" && (
              <p className={`text-xs font-semibold ${vid ? "text-emerald-700" : "text-rose-700"}`}>{vid ? "YouTube link looks good." : "This is not a YouTube link."}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setDraft(null)} disabled={saving} className={`${btnGhost} flex-1`}>Cancel</button>
              <button type="button" onClick={() => void save()} disabled={saving} className={`${btnPrimary} flex-1`}>{saving ? <Spinner /> : null} Save</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function IconBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="flex h-[22px] w-11 items-center justify-center text-slate-500 hover:text-[#075985] disabled:opacity-30">
      {children}
    </button>
  );
}
