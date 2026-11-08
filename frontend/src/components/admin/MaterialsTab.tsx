"use client";

import React, { useMemo, useState } from "react";
import { ExternalLink, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { errorText, isDriveLink, SUBJECT_COLOR, subjectLabel } from "./format";
import type { MaterialRow } from "./types";
import { btnAccent, btnGhost, btnPrimary, Card, inputClass, Modal, Skeleton, Spinner, useUi } from "./ui";

const SUBJECTS = ["PHYSICS", "CHEMISTRY", "HIGHER_MATH"];

interface Draft {
  id: string | null;
  title: string;
  chapter: string;
  subject: string;
  file_url: string;
}

interface Props {
  materials: MaterialRow[];
  loading: boolean;
  error: string | null;
  onChanged: () => void;
  onRetry: () => void;
}

export default function MaterialsTab({ materials, loading, error, onChanged, onRetry }: Props) {
  const { toast, confirm } = useUi();
  const [subject, setSubject] = useState("ALL");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = useMemo(
    () => materials.filter((m) => subject === "ALL" || m.subject === subject).sort((a, b) => a.subject.localeCompare(b.subject) || a.chapter.localeCompare(b.chapter) || a.title.localeCompare(b.title)),
    [materials, subject]
  );

  const act = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusyId(id);
    try {
      await fn();
      toast("success", ok);
      onChanged();
    } catch (err) {
      toast("error", errorText(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (m: MaterialRow) => {
    const ok = await confirm({ title: "Delete this sheet?", message: `"${m.title}" will disappear for every student.`, confirmLabel: "Delete", danger: true });
    if (ok) await act(m.id, () => api.delete(`/api/v1/admin/materials/${m.id}`), "Sheet deleted.");
  };

  const save = async () => {
    if (!draft) return;
    const title = draft.title.trim();
    const chapter = draft.chapter.trim();
    if (!title || !chapter) return toast("error", "Title and chapter are required.");
    if (!isDriveLink(draft.file_url.trim())) return toast("error", "Use a Google Drive link. Upload the PDF to Drive and share it as 'Anyone with the link'.");
    const body = { title, chapter, subject: draft.subject, file_url: draft.file_url.trim() };
    setSaving(true);
    try {
      if (draft.id) await api.put(`/api/v1/admin/materials/${draft.id}`, body);
      else await api.post("/api/v1/admin/materials", body);
      toast("success", draft.id ? "Sheet updated." : "Sheet added.");
      setDraft(null);
      onChanged();
    } catch (err) {
      toast("error", errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const linkOk = draft ? isDriveLink(draft.file_url.trim()) : false;

  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-2 gap-2">
        <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" className={inputClass}>
          <option value="ALL">All subjects</option>
          {SUBJECTS.map((s) => <option key={s} value={s}>{subjectLabel(s)}</option>)}
        </select>
        <button type="button" onClick={() => setDraft({ id: null, title: "", chapter: "", subject: subject === "ALL" ? "PHYSICS" : subject, file_url: "" })} className={btnAccent}>
          <Plus className="h-4 w-4" /> Add sheet
        </button>
        <p className="col-span-2 text-[11px] text-slate-500">Sheets are stored on Google Drive. Share the file as &quot;Anyone with the link can view&quot;, then paste the link here.</p>
      </Card>

      {loading && materials.length === 0 ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : error && materials.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm font-semibold text-slate-600">{error}</p>
          <button type="button" onClick={onRetry} className={`${btnGhost} mt-3`}>Try again</button>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="py-10 text-center text-sm text-slate-500">{materials.length === 0 ? "No study sheets yet." : "No sheets for this subject."}</Card>
      ) : (
        <ul className="space-y-2">
          {rows.map((m) => {
            const busy = busyId === m.id;
            return (
              <li key={m.id} className={`rounded-2xl border border-[#D3E3EF] bg-white p-3 shadow-sm ${m.is_published ? "" : "opacity-70"}`}>
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: SUBJECT_COLOR[m.subject] || "#0369A1" }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#0F172A]">{m.title}</p>
                    <p className="truncate text-[11px] text-slate-500">{subjectLabel(m.subject)} · {m.chapter}</p>
                    {!m.is_published && <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">Hidden from students</span>}
                  </div>
                  <a href={m.file_url} target="_blank" rel="noopener noreferrer" aria-label="Open in Drive" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-[#075985]">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button type="button" disabled={busy} onClick={() => void act(m.id, () => api.patch(`/api/v1/admin/materials/${m.id}/toggle-publish`), m.is_published ? "Hidden from students." : "Now visible to students.")} className={`${btnGhost} !min-h-[44px] text-xs`}>
                    {busy ? <Spinner /> : m.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {m.is_published ? "Hide" : "Publish"}
                  </button>
                  <button type="button" onClick={() => setDraft({ id: m.id, title: m.title, chapter: m.chapter, subject: m.subject, file_url: m.file_url })} className={`${btnGhost} !min-h-[44px] text-xs`}>
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  <button type="button" disabled={busy} onClick={() => void remove(m)} className={`${btnGhost} !min-h-[44px] text-xs text-rose-700`}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={!!draft} onClose={() => !saving && setDraft(null)} title={draft?.id ? "Edit sheet" : "Add sheet"}>
        {draft && (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500">Subject
              <select value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className={`${inputClass} mt-1`}>
                {SUBJECTS.map((s) => <option key={s} value={s}>{subjectLabel(s)}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-slate-500">Chapter
              <input list="material-chapters" value={draft.chapter} onChange={(e) => setDraft({ ...draft, chapter: e.target.value })} className={`${inputClass} mt-1`} />
              <datalist id="material-chapters">
                {Array.from(new Set(materials.filter((m) => m.subject === draft.subject).map((m) => m.chapter))).map((c) => <option key={c} value={c} />)}
              </datalist>
            </label>
            <label className="block text-xs font-bold text-slate-500">Title
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={`${inputClass} mt-1`} />
            </label>
            <label className="block text-xs font-bold text-slate-500">Google Drive link
              <input type="url" inputMode="url" value={draft.file_url} onChange={(e) => setDraft({ ...draft, file_url: e.target.value })} placeholder="https://drive.google.com/file/d/..." className={`${inputClass} mt-1`} />
            </label>
            {draft.file_url.trim() !== "" && <p className={`text-xs font-semibold ${linkOk ? "text-emerald-700" : "text-rose-700"}`}>{linkOk ? "Drive link looks good." : "This is not a Google Drive link."}</p>}
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
