"use client";

import { useState } from "react";
import { CAR_CLASS_LABEL, WORKSHOP_LABEL } from "@/lib/pricing/data";
import { URGENCY, VERDICT, formatDate, zl, zlRange } from "@/lib/format";
import type { AnalysisResult, LineResult } from "@/lib/types";
import { PriceBar, VerdictBadge } from "./Verdict";

const SOURCE_LABEL: Record<LineResult["source"], string> = {
  baza: "Porównanie z bazą cen",
  ai: "Szacunek AI (pozycji nie ma w bazie)",
  brak: "Brak danych do porównania",
};

function summaryText(r: AnalysisResult): string {
  const lines = r.lines.map(
    (l) => `• ${l.repairName}: ${zl(l.charged)} (typowo ${zlRange(l.expected)}) – ${VERDICT[l.verdict].label}`,
  );
  return [
    `Uczciwy Mechanik – ocena wyceny${r.vehicle ? ` (${r.vehicle})` : ""}`,
    `Razem: ${zl(r.total)} – ${VERDICT[r.verdict].label}`,
    r.summary,
    "",
    ...lines,
  ].join("\n");
}

function Line({ line }: { line: LineResult }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-t border-slate-100 py-4 first:border-t-0">
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left" aria-expanded={open}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-ink">{line.repairName}</p>
            {line.description !== line.repairName && <p className="truncate text-sm text-slate-500">{line.description}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold">{zl(line.charged)}</p>
            <VerdictBadge verdict={line.verdict} />
          </div>
        </div>
        <PriceBar charged={line.charged} range={line.expected} verdict={line.verdict} />
        <p className="mt-2 text-sm font-medium text-brand-700">{open ? "Zwiń szczegóły ▲" : "Co to za naprawa? ▼"}</p>
      </button>

      {open && (
        <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
          {line.info && (
            <>
              <p>{line.info.whatIsIt}</p>
              <p>
                <span
                  className={`mr-2 inline-block rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${URGENCY[line.info.urgency].cls}`}
                >
                  {URGENCY[line.info.urgency].label}
                </span>
                <strong>Czy można jeździć?</strong> {line.info.canDrive}
              </p>
            </>
          )}
          {line.note && <p>💬 {line.note}</p>}
          {(line.partsExpected || line.laborExpected) && (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="pb-1 font-medium" />
                  <th className="pb-1 font-medium">Wycena</th>
                  <th className="pb-1 font-medium">Typowo</th>
                </tr>
              </thead>
              <tbody>
                {line.partsExpected && (
                  <tr>
                    <td className="py-0.5">Części</td>
                    <td>{zl(line.partsPrice)}</td>
                    <td>{zlRange(line.partsExpected)}</td>
                  </tr>
                )}
                {line.laborExpected && (
                  <tr>
                    <td className="py-0.5">{line.partsExpected ? "Robocizna" : "Usługa"}</td>
                    <td>{zl(line.laborPrice + (line.partsExpected ? 0 : line.partsPrice))}</td>
                    <td>{zlRange(line.laborExpected)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          <p className="text-xs text-slate-500">{SOURCE_LABEL[line.source]}</p>
        </div>
      )}
    </li>
  );
}

export function ResultView({ result, onNew }: { result: AnalysisResult; onNew?: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText(result));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* schowek niedostępny */
    }
  };

  return (
    <div className="space-y-4">
      {result.demo && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Tryb demo.</strong> AI nie jest jeszcze podłączone, więc zamiast Twojego zdjęcia pokazujemy
          przykładową wycenę. Ocena cen działa naprawdę – możesz to sprawdzić, wpisując pozycje ręcznie.
        </div>
      )}

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <VerdictBadge verdict={result.verdict} large />
          <p className="text-xs text-slate-500">{formatDate(result.createdAt)}</p>
        </div>
        <p className="mt-4 text-3xl font-bold">{zl(result.total)}</p>
        {result.expectedTotal && (
          <p className="text-sm text-slate-600">
            Typowa cena ocenionych pozycji: <strong>{zlRange(result.expectedTotal)}</strong>
          </p>
        )}
        {result.overpay > 0 && (
          <p className="mt-2 inline-block rounded-lg bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
            Możesz przepłacać ok. {zl(result.overpay)}
          </p>
        )}
        <p className="mt-4 leading-relaxed text-slate-700">{result.summary}</p>
        <dl className="mt-4 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
          {result.vehicle && (
            <div>
              <dt className="inline text-slate-500">Auto: </dt>
              <dd className="inline font-medium">{result.vehicle}</dd>
            </div>
          )}
          {result.workshop && (
            <div>
              <dt className="inline text-slate-500">Warsztat: </dt>
              <dd className="inline font-medium">{result.workshop}</dd>
            </div>
          )}
          <div>
            <dt className="inline text-slate-500">Klasa: </dt>
            <dd className="inline">{CAR_CLASS_LABEL[result.carClass]}</dd>
          </div>
          <div>
            <dt className="inline text-slate-500">Rodzaj: </dt>
            <dd className="inline">{WORKSHOP_LABEL[result.workshopType]}</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">Pozycje z wyceny</h2>
        <ul className="mt-2">
          {result.lines.map((l, i) => (
            <Line key={i} line={l} />
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">Zapytaj mechanika</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-700">
          {result.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        {onNew && (
          <button type="button" className="btn-primary sm:flex-1" onClick={onNew}>
            Sprawdź kolejną wycenę
          </button>
        )}
        <button type="button" className="btn-ghost sm:flex-1" onClick={copy}>
          {copied ? "Skopiowano ✓" : "Kopiuj podsumowanie"}
        </button>
      </div>
    </div>
  );
}
