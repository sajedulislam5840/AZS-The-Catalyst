"use client";

import { Megaphone } from "lucide-react";
import type { Notice } from "@/lib/dashboard-types";
import Sheet from "./Sheet";

export default function NoticeSheet({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  const when = notice.created_at ? new Date(notice.created_at) : null;
  return (
    <Sheet title="Notice from your teacher" onClose={onClose}>
      <div className="space-y-4 p-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDE2D9] text-[#CC310E]">
          <Megaphone className="h-6 w-6" />
        </span>
        <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-slate-800">{notice.content}</p>
        {when && !Number.isNaN(when.getTime()) && <p className="text-xs font-semibold text-slate-500">Posted {when.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</p>}
      </div>
    </Sheet>
  );
}
