"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ResultView } from "@/components/ResultView";
import { VerdictBadge } from "@/components/Verdict";
import { formatDate, zl } from "@/lib/format";
import { loadHistory, removeFromHistory } from "@/lib/storage";
import type { AnalysisResult } from "@/lib/types";

export default function HistoriaPage() {
  const [items, setItems] = useState<AnalysisResult[] | null>(null);
  const [open, setOpen] = useState<AnalysisResult | null>(null);

  useEffect(() => setItems(loadHistory()), []);

  if (open) {
    return (
      <div className="space-y-4">
        <button type="button" className="text-sm font-semibold text-brand-700" onClick={() => setOpen(null)}>← Wróć do historii</button>
        <ResultView result={open} />
      </div>
    );
  }

  if (items === null) return null;

  const total = items.reduce((s, r) => s + r.total, 0);
  const overpay = items.reduce((s, r) => s + r.overpay, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Historia sprawdzeń</h1>
        <p className="mt-1 text-slate-600">Zapisywana tylko na tym urządzeniu.</p>
      </div>

      {items.length === 0 ? (
        <div className="card text-center">
          <p className="text-slate-600">Nie masz jeszcze żadnych sprawdzonych wycen.</p>
          <Link href="/wycena" className="btn-primary mt-4">Sprawdź pierwszą wycenę</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="card">
              <p className="text-sm text-slate-500">Suma wycen</p>
              <p className="mt-1 text-2xl font-bold">{zl(total)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-slate-500">Możliwe przepłaty</p>
              <p className={`mt-1 text-2xl font-bold ${overpay > 0 ? "text-red-600" : ""}`}>{zl(overpay)}</p>
            </div>
          </div>
          <ul className="space-y-3">
            {items.map((r) => (
              <li key={r.id} className="card flex items-center justify-between gap-3 !p-4">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(r)}>
                  <p className="truncate font-semibold">{r.vehicle ?? r.lines.map((l) => l.repairName).join(", ")}</p>
                  <p className="text-xs text-slate-500">{formatDate(r.createdAt)} · {r.lines.length} poz.</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-semibold">{zl(r.total)}</span>
                    <VerdictBadge verdict={r.verdict} />
                  </div>
                </button>
                <button
                  type="button"
                  aria-label="Usuń z historii"
                  className="shrink-0 rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => {
                    removeFromHistory(r.id);
                    setItems(loadHistory());
                  }}
                >
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
