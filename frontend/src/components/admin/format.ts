import { isAxiosError } from "axios";
import type { SubStatus } from "./types";

export const STATUS_META: Record<SubStatus, { label: string; hint: string; bar: string; pill: string }> = {
  active: { label: "Active", hint: "Paid, more than 7 days left", bar: "#0369A1", pill: "bg-sky-50 text-sky-800 border-sky-200" },
  expiring: { label: "Expiring", hint: "7 days or fewer left", bar: "#F59E0B", pill: "bg-amber-50 text-amber-800 border-amber-200" },
  expired: { label: "Expired", hint: "Paid before, now locked", bar: "#CC310E", pill: "bg-rose-50 text-[#CC310E] border-rose-200" },
  pending: { label: "Not paid", hint: "Never paid, locked", bar: "#94A3B8", pill: "bg-slate-100 text-slate-600 border-slate-200" },
};

export const SUBJECT_COLOR: Record<string, string> = {
  PHYSICS: "#0369A1",
  CHEMISTRY: "#CC310E",
  HIGHER_MATH: "#075985",
};

export const subjectLabel = (s: string) => (s === "HIGHER_MATH" ? "Higher Math" : s.charAt(0) + s.slice(1).toLowerCase());

export function fmtDate(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(iso?: string | null, now: number = Date.now()): string {
  if (!iso) return "Never";
  const t = new Date(iso.length === 10 ? iso + "T12:00:00" : iso).getTime();
  if (Number.isNaN(t)) return "Never";
  const days = Math.floor((now - t) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** What went wrong when no response came back, including which server was tried. */
export function noResponseText(err: unknown): string {
  const e = err as { code?: string; config?: { baseURL?: string; url?: string } } | undefined;
  let host = "";
  try {
    host = new URL(e?.config?.baseURL || e?.config?.url || "").host;
  } catch {
    host = "";
  }
  const where = host ? ` (${host})` : "";
  if (e?.code === "ECONNABORTED" || e?.code === "ETIMEDOUT") {
    return `The server${where} took too long to answer. It may be waking up, so wait a minute and try again.`;
  }
  return `Can't reach the server${where}. It may be waking up, or the address may be wrong. Wait a moment and try again.`;
}

/** The most useful sentence we can show for a failed request. */
export function errorText(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (isAxiosError(err)) {
    if (!err.response) return noResponseText(err);
    const d = err.response.data?.detail;
    if (typeof d === "string") return d;
    if (d && typeof d === "object" && !Array.isArray(d) && typeof d.message === "string") return d.message;
    if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg);
    if (err.response.status === 401) return "Your login has expired. Please sign in again.";
    if (err.response.status === 403) return "You don't have permission to do that.";
  }
  return fallback;
}

export function httpStatus(err: unknown): number | null {
  return isAxiosError(err) && err.response ? err.response.status : null;
}

/** YouTube video id from a pasted link, or null. */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return /^[\w-]{6,}$/.test(u.pathname.slice(1)) ? u.pathname.slice(1) : null;
    if (host.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{6,}$/.test(v)) return v;
      const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/);
      return m ? m[1] : null;
    }
  } catch {
    // not a URL yet
  }
  return null;
}

export const isDriveLink = (url: string) => /^https:\/\/(drive|docs)\.google\.com\//.test(url);
