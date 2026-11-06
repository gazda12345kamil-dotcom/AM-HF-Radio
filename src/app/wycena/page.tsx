"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ResultView } from "@/components/ResultView";
import { CAR_CLASS_LABEL, REPAIRS, WORKSHOP_LABEL, getRepair } from "@/lib/pricing/data";
import { countPhotoCheck, currentPlan, remainingPhotoChecks, saveToHistory } from "@/lib/storage";
import type { AnalysisResult, CarClass, WorkshopType } from "@/lib/types";

type Row = { repairKey: string; description: string; partsPrice: string; laborPrice: string };
const emptyRow = (): Row => ({ repairKey: "klocki-tarcze-przod", description: "", partsPrice: "", laborPrice: "" });

/** Zmniejsza zdjęcie przed wysłaniem (szybciej i taniej, a tekst nadal czytelny). */
async function compressImage(file: File, maxSide = 1600): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

const toNumber = (s: string) => Number(s.replace(",", ".").replace(/[^\d.]/g, "")) || 0;

export default function WycenaPage() {
  const [tab, setTab] = useState<"photo" | "manual">("photo");
  const [carClass, setCarClass] = useState<CarClass | "auto">("auto");
  const [workshopType, setWorkshopType] = useState<WorkshopType>("niezalezny");
  const [vehicle, setVehicle] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRemaining(remainingPhotoChecks());
    fetch("/api/status")
      .then((r) => r.json())
      .then((s: { ai: boolean }) => setAiOn(s.ai))
      .catch(() => setAiOn(false));
  }, []);

  const onFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Wybierz zdjęcie (JPG, PNG). Pliki PDF obsłużymy w kolejnej wersji.");
      return;
    }
    try {
      setPhoto(await compressImage(file));
    } catch {
      setError("Nie udało się wczytać zdjęcia. Spróbuj innego pliku.");
    }
  };

  const send = async (payload: object) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { result?: AnalysisResult; error?: string };
      if (!res.ok || !data.result) throw new Error(data.error || "Coś poszło nie tak.");
      const r = data.result;
      if (r.source === "zdjecie" && !r.demo) {
        countPhotoCheck();
        setRemaining(remainingPhotoChecks());
      }
      if (!r.demo) saveToHistory(r);
      setResult(r);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Coś poszło nie tak.");
    } finally {
      setLoading(false);
    }
  };

  const submitPhoto = () => {
    if (!photo) return setError("Najpierw dodaj zdjęcie wyceny.");
    if (aiOn && remaining === 0) return setError("limit");
    send({ mode: "photo", image: photo, carClass, workshopType, vehicle });
  };

  const submitManual = () => {
    const lines = rows
      .map((r) => ({
        repairKey: r.repairKey || null,
        description: r.repairKey ? getRepair(r.repairKey)?.name ?? "" : r.description,
        partsPrice: toNumber(r.partsPrice),
        laborPrice: toNumber(r.laborPrice),
      }))
      .filter((l) => l.partsPrice + l.laborPrice > 0);
    if (!lines.length) return setError("Wpisz kwotę przy co najmniej jednej pozycji.");
    send({ mode: "manual", lines, carClass, workshopType, vehicle });
  };

  const reset = () => {
    setResult(null);
    setPhoto(null);
    setRows([emptyRow()]);
    setError(null);
  };

  if (result) return <ResultView result={result} onNew={reset} />;

  const updateRow = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Sprawdź wycenę</h1>
        <p className="mt-1 text-slate-600">Dowiesz się, czy cena jest uczciwa, co to za naprawa i o co zapytać mechanika.</p>
      </div>

      <div className="grid grid-cols-2 rounded-xl bg-slate-200/70 p-1 text-sm font-semibold">
        {(["photo", "manual"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setError(null);
            }}
            className={`rounded-lg py-2.5 transition ${tab === t ? "bg-white text-ink shadow-sm" : "text-slate-600"}`}
          >
            {t === "photo" ? "📷 Zdjęcie wyceny" : "✏️ Wpiszę ręcznie"}
          </button>
        ))}
      </div>

      <section className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="car">Jakie to auto?</label>
            <input id="car" className="field" placeholder="np. Škoda Octavia 2016 2.0 TDI" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="class">Klasa auta</label>
            <select id="class" className="field" value={carClass} onChange={(e) => setCarClass(e.target.value as CarClass | "auto")}>
              <option value="auto">{tab === "photo" ? "Nie wiem – niech AI oceni" : "Nie wiem (przyjmę średnie)"}</option>
              {(Object.keys(CAR_CLASS_LABEL) as CarClass[]).map((k) => (
                <option key={k} value={k}>{CAR_CLASS_LABEL[k]}</option>
              ))}
            </select>
          </div>
        </div>
        <fieldset>
          <legend className="label">Gdzie robisz naprawę?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(WORKSHOP_LABEL) as WorkshopType[]).map((k) => (
              <label
                key={k}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 ${
                  workshopType === k ? "border-brand-600 bg-brand-50" : "border-slate-300"
                }`}
              >
                <input type="radio" name="ws" checked={workshopType === k} onChange={() => setWorkshopType(k)} className="accent-emerald-600" />
                {WORKSHOP_LABEL[k]}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {tab === "photo" ? (
        <section className="card space-y-4">
          {aiOn === false && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              AI nie jest jeszcze podłączone – po wysłaniu zobaczysz <strong>przykładowy</strong> wynik.
            </p>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          {photo ? (
            <div className="space-y-3">
              <img src={photo} alt="Podgląd wyceny" className="max-h-80 w-full rounded-xl border border-slate-200 object-contain" />
              <button type="button" className="btn-ghost w-full" onClick={() => fileRef.current?.click()}>Zmień zdjęcie</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-slate-600 transition hover:border-brand-600 hover:bg-brand-50"
            >
              <span className="text-4xl">📷</span>
              <span className="font-semibold text-ink">Zrób zdjęcie albo wybierz z galerii</span>
              <span className="text-sm">Wycena, kosztorys albo faktura z warsztatu</span>
            </button>
          )}
          <p className="text-xs text-slate-500">
            Zdjęcie służy tylko do odczytania cen i nie jest przechowywane na serwerze. Zasłoń dane osobowe, jeśli wolisz.
          </p>
          {aiOn && remaining !== null && (
            <p className="text-sm text-slate-600">
              Pozostało sprawdzeń zdjęć w tym miesiącu: <strong>{remaining}</strong> (plan {currentPlan().name})
            </p>
          )}
          <button type="button" className="btn-primary w-full" disabled={loading} onClick={submitPhoto}>
            {loading ? "Czytam wycenę…" : "Sprawdź wycenę"}
          </button>
        </section>
      ) : (
        <section className="card space-y-4">
          {rows.map((row, i) => {
            const ref = getRepair(row.repairKey);
            const flat = Boolean(ref?.flat);
            return (
              <div key={i} className="space-y-3 rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">Pozycja {i + 1}</span>
                  {rows.length > 1 && (
                    <button type="button" className="text-sm text-red-600" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Usuń</button>
                  )}
                </div>
                <select className="field" value={row.repairKey} onChange={(e) => updateRow(i, { repairKey: e.target.value })} aria-label="Rodzaj naprawy">
                  {REPAIRS.map((r) => (
                    <option key={r.key} value={r.key}>{r.name}</option>
                  ))}
                  <option value="">Inna naprawa (wpiszę nazwę)</option>
                </select>
                {!row.repairKey && (
                  <input className="field" placeholder="Nazwa naprawy" value={row.description} onChange={(e) => updateRow(i, { description: e.target.value })} />
                )}
                <div className="grid grid-cols-2 gap-3">
                  {!flat && (
                    <div>
                      <label className="label">Części (zł)</label>
                      <input className="field" inputMode="decimal" placeholder="0" value={row.partsPrice} onChange={(e) => updateRow(i, { partsPrice: e.target.value })} />
                    </div>
                  )}
                  <div className={flat ? "col-span-2" : ""}>
                    <label className="label">{flat ? "Cena usługi (zł)" : "Robocizna (zł)"}</label>
                    <input className="field" inputMode="decimal" placeholder="0" value={row.laborPrice} onChange={(e) => updateRow(i, { laborPrice: e.target.value })} />
                  </div>
                </div>
              </div>
            );
          })}
          <button type="button" className="btn-ghost w-full" onClick={() => setRows([...rows, emptyRow()])}>+ Dodaj pozycję</button>
          <p className="text-xs text-slate-500">Wpisuj kwoty brutto (z VAT). Jeśli mechanik podał jedną kwotę, wpisz ją w „Robocizna”.</p>
          <button type="button" className="btn-primary w-full" disabled={loading} onClick={submitManual}>
            {loading ? "Sprawdzam…" : "Sprawdź wycenę"}
          </button>
        </section>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error === "limit" ? (
            <>
              Limit sprawdzeń zdjęć w tym miesiącu został wykorzystany. Możesz wpisać pozycje ręcznie (bez limitu) albo{" "}
              <Link href="/cennik" className="font-semibold underline">zobaczyć plany</Link>.
            </>
          ) : (
            error
          )}
        </div>
      )}
    </div>
  );
}
