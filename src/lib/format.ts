import type { Range, Urgency, Verdict } from "./types";

export const zl = (n: number) => `${Math.round(n).toLocaleString("pl-PL")} zł`;
export const zlRange = (r: Range | null) => (r ? `${zl(r.min)} – ${zl(r.max)}` : "—");

export const VERDICT: Record<Verdict, { label: string; badge: string; bar: string }> = {
  ok: { label: "Uczciwa cena", badge: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-500" },
  tanio: { label: "Taniej niż zwykle", badge: "bg-sky-100 text-sky-800", bar: "bg-sky-500" },
  drozej: { label: "Trochę drożej", badge: "bg-amber-100 text-amber-800", bar: "bg-amber-500" },
  drogo: { label: "Drogo", badge: "bg-red-100 text-red-800", bar: "bg-red-500" },
  "brak-danych": { label: "Brak danych", badge: "bg-slate-100 text-slate-700", bar: "bg-slate-400" },
};

export const URGENCY: Record<Urgency, { label: string; cls: string }> = {
  pilne: { label: "Pilne", cls: "bg-red-50 text-red-700 ring-red-200" },
  wkrotce: { label: "Zrób wkrótce", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  "moze-poczekac": { label: "Może poczekać", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("pl-PL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
