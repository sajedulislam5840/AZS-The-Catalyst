import type { Ledger, LedgerRow } from "./types";

/** "2026-11" -> the first moment of that month and of the next one, in the admin's own time zone. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}

export function monthLabel(month: string): string {
  const { start } = monthRange(month);
  return start.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local date and time as "08 Nov 2026, 14:05", the same on every device. */
export function stamp(iso: string): string {
  const d = new Date(iso);
  const mon = d.toLocaleDateString("en-GB", { month: "short" });
  return `${pad(d.getDate())} ${mon} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function day(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const HEADERS = ["Date", "Student", "Email", "Batch", "Days added", "Amount (BDT)", "Active until", "Note", "Recorded by", "Status"];

function cells(r: LedgerRow): string[] {
  return [
    stamp(r.created_at),
    r.full_name,
    r.email,
    r.batch_no,
    String(r.days_added),
    r.amount === null ? "" : String(r.amount),
    day(r.new_end),
    r.note || "",
    r.recorded_by || "",
    r.voided ? "Undone" : "Paid",
  ];
}

function csvField(v: string): string {
  // Quote everything; a leading = + - @ is neutralised so Excel never runs it as a formula.
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(ledger: Ledger, month: string) {
  const lines = [HEADERS, ...ledger.payments.map(cells)].map((row) => row.map(csvField).join(","));
  lines.push("");
  lines.push([csvField("Total"), csvField(""), csvField(""), csvField(""), csvField(""), csvField(String(ledger.totals.amount))].join(","));
  // The BOM makes Excel read Bangla names and notes as UTF-8 instead of garbling them.
  save(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `payments-${month}.csv`);
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/**
 * Opens a print-ready page of the month and the browser's print dialog, where "Save as PDF" makes the file.
 * The browser draws the text itself, so Bangla names and notes come out right, which a JavaScript PDF
 * library cannot do without shipping a large Bangla font.
 */
export function openPdf(ledger: Ledger, month: string): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;
  const t = ledger.totals;
  const rows = ledger.payments
    .map((r) => {
      const c = cells(r);
      return `<tr class="${r.voided ? "void" : ""}"><td>${esc(c[0])}</td><td><b>${esc(c[1])}</b><br><small>${esc(c[2])}</small></td><td>${esc(c[3])}</td><td class="n">${esc(c[4])}</td><td class="n">${r.amount === null ? "-" : "৳" + r.amount.toLocaleString("en-US")}</td><td>${esc(c[6])}</td><td>${esc(c[7])}</td><td>${esc(c[9])}</td></tr>`;
    })
    .join("");
  win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>payments-${esc(month)}</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Noto Sans Bengali", "Hind Siliguri", "Nirmala UI", "Segoe UI", Arial, sans-serif; color: #0F172A; margin: 0; padding: 16px; }
  h1 { font-size: 20px; margin: 0; color: #075985; }
  .sub { color: #475569; font-size: 12px; margin: 4px 0 14px; }
  .sum { display: flex; gap: 10px; margin-bottom: 14px; }
  .sum div { border: 1px solid #D3E3EF; border-radius: 8px; padding: 8px 12px; font-size: 11px; color: #475569; }
  .sum b { display: block; font-size: 18px; color: #0F172A; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; background: #F3F8FC; color: #075985; border-bottom: 2px solid #D3E3EF; padding: 6px; }
  td { border-bottom: 1px solid #E2EDF5; padding: 6px; vertical-align: top; }
  td.n, th.n { text-align: right; }
  small { color: #64748B; }
  tr.void td { color: #94A3B8; text-decoration: line-through; }
  tr { page-break-inside: avoid; }
  .foot { margin-top: 12px; font-size: 10px; color: #64748B; }
  .bar { margin-bottom: 14px; }
  .bar button { font: inherit; font-weight: 700; background: #CC310E; color: #fff; border: 0; border-radius: 8px; padding: 10px 16px; }
  @media print { .bar { display: none; } body { padding: 0; } }
</style></head><body>
<div class="bar"><button onclick="window.print()">Save as PDF</button></div>
<h1>AZS The Catalyst: cash payments</h1>
<p class="sub">${esc(monthLabel(month))} · made ${esc(stamp(new Date().toISOString()))}</p>
<div class="sum">
  <div><b>৳${t.amount.toLocaleString("en-US")}</b>collected${t.amounts_recorded < t.payments ? ` (${t.payments - t.amounts_recorded} without an amount)` : ""}</div>
  <div><b>${t.payments}</b>renewals</div>
  <div><b>${t.students}</b>students</div>
  ${t.voided ? `<div><b>${t.voided}</b>undone, not counted</div>` : ""}
</div>
<table><thead><tr><th>Date</th><th>Student</th><th>Batch</th><th class="n">Days</th><th class="n">Amount</th><th>Active until</th><th>Note</th><th>Status</th></tr></thead>
<tbody>${rows || `<tr><td colspan="8">No payments this month.</td></tr>`}</tbody></table>
<p class="foot">Undone payments are crossed out and left out of the totals.</p>
<script>window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 300); });</script>
</body></html>`);
  win.document.close();
  return true;
}
