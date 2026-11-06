"use client";

import { memo } from "react";
import { Download, Eye, FileText } from "lucide-react";
import type { Material } from "@/lib/dashboard-types";

function MaterialCard({ material, onPreview }: { material: Material; onPreview: (m: Material) => void }) {
  const url = material.pdf_url || material.file_url || "";
  const physics = material.subject.toUpperCase() !== "CHEMISTRY";
  return (
    <article className="dash-card dash-lift flex flex-col justify-between gap-5 p-5">
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${physics ? "bg-sky-100 text-[#0369A1]" : "bg-[#FDE2D9] text-[#CC310E]"}`}>
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">{material.title}</h3>
          <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">
            {physics ? "Physics" : "Chemistry"} · {material.chapter}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => onPreview(material)} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 text-xs font-extrabold text-slate-800 active:scale-[0.97]">
          <Eye className="h-4 w-4" /> Preview
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Download ${material.title}`} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#CC310E] text-white active:scale-95">
          <Download className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}

export default memo(MaterialCard);
