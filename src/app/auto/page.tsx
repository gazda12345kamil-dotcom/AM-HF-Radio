"use client";

import { useState } from "react";
import { lookupVin } from "@/lib/api";
import type { VinOnline } from "@/lib/vin";
import type { VinResponse } from "@/lib/vin-check";

const ONLINE_LABELS: [keyof VinOnline, string][] = [
  ["make", "Marka"],
  ["model", "Model"],
  ["modelYear", "Rok modelowy"],
  ["body", "Nadwozie"],
  ["fuel", "Paliwo"],
  ["engineL", "Pojemność silnika (l)"],
  ["engineHp", "Moc (KM)"],
  ["plantCountry", "Kraj fabryki"],
];

const CHECKLIST = [
  "Porównaj VIN w dowodzie rejestracyjnym, na tabliczce i na szybie – wszystkie muszą być identyczne.",
  "Sprawdź historię w bazie historiapojazdu.gov.pl: przebieg z badań technicznych, ważność OC i badania, liczbę właścicieli.",
  "Poproś o odczyt błędów komputerem (diagnostyka) – w warsztacie to zwykle 80–200 zł.",
  "Zmierz grubość lakieru miernikiem – duże różnice oznaczają naprawy blacharskie.",
  "Odpal auto na zimnym silniku i zrób jazdę próbną: hamowanie, stuki na nierównościach, praca sprzęgła.",
  "Sprawdź, czy auto nie jest obciążone zastawem rejestrowym (rejestr zastawów, niewielka opłata).",
  "Spisz umowę kupna-sprzedaży z numerem VIN, przebiegiem i danymi obu stron.",
];

export default function AutoPage() {
  const [vin, setVin] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VinResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setData(await lookupVin(vin));
    } catch {
      setError("Nie udało się sprawdzić numeru. Sprawdź połączenie z internetem.");
    } finally {
      setLoading(false);
    }
  };

  const basic = data?.basic;
  const online = data?.online ?? {};
  const onlineRows = ONLINE_LABELS.filter(([k]) => online[k]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Sprawdź auto</h1>
        <p className="mt-1 text-slate-600">
          Wpisz numer VIN, a sprawdzimy, czy jest poprawny, kto i gdzie wyprodukował auto oraz z którego jest rocznika.
        </p>
      </div>

      <form onSubmit={check} className="card space-y-3">
        <label className="label" htmlFor="vin">Numer VIN (17 znaków)</label>
        <input
          id="vin"
          className="field font-mono uppercase tracking-wider"
          placeholder="np. WVWZZZ1KZAW000001"
          value={vin}
          maxLength={25}
          autoCapitalize="characters"
          autoComplete="off"
          onChange={(e) => setVin(e.target.value)}
        />
        <p className="text-xs text-slate-500">VIN znajdziesz w dowodzie rejestracyjnym (pole E), na szybie przy wycieraczce albo w ogłoszeniu.</p>
        <button className="btn-primary w-full" disabled={loading || vin.trim().length < 5}>
          {loading ? "Sprawdzam…" : "Sprawdź VIN"}
        </button>
      </form>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {basic && !basic.valid && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{basic.error}</div>
      )}

      {basic?.valid && (
        <>
          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-lg font-bold tracking-wider">{basic.vin}</p>
              <button
                type="button"
                className="text-sm font-semibold text-brand-700"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(basic.vin);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    /* schowek niedostępny */
                  }
                }}
              >
                {copied ? "Skopiowano ✓" : "Kopiuj VIN"}
              </button>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="Producent" value={basic.manufacturer ?? "Nieznany prefiks – sprawdź w bazie poniżej"} />
              <Info label="Kraj produkcji" value={basic.country ?? "—"} />
              <Info
                label="Możliwy rok modelowy"
                value={basic.modelYear ? `${basic.modelYear}` : "—"}
                hint="Część producentów z Europy nie koduje roku w VIN – porównaj z dowodem rejestracyjnym."
              />
              <Info
                label="Cyfra kontrolna"
                value={basic.checkDigitOk ? "Zgodna ✓" : "Niezgodna"}
                hint={basic.checkDigitOk ? undefined : "W autach z Europy to normalne. W autach z USA/Kanady oznacza błąd w numerze lub przeróbkę."}
              />
            </dl>
          </section>

          <section className="card">
            <h2 className="text-lg font-bold">Dane z bazy online (NHTSA)</h2>
            {onlineRows.length > 0 ? (
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {onlineRows.map(([k, label]) => (
                  <Info key={k} label={label} value={String(online[k])} />
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                {data?.onlineError ??
                  "Ta darmowa baza ma pełne dane głównie dla aut z rynku amerykańskiego. Dla tego numeru nie zwróciła szczegółów."}
              </p>
            )}
          </section>

          <section className="card space-y-3">
            <h2 className="text-lg font-bold">Sprawdź za darmo w oficjalnych bazach</h2>
            <a
              href="https://historiapojazdu.gov.pl/"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-slate-200 p-4 transition hover:border-brand-600 hover:bg-brand-50"
            >
              <p className="font-semibold text-ink">Historia Pojazdu (gov.pl) ↗</p>
              <p className="mt-1 text-sm text-slate-600">
                Przebieg z badań technicznych, ważność OC i przeglądu, liczba właścicieli, informacja o kradzieży. Potrzebujesz:
                numeru rejestracyjnego, VIN i daty pierwszej rejestracji (z dowodu lub ogłoszenia).
              </p>
            </a>
            <a
              href="https://www.ufg.pl/"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-slate-200 p-4 transition hover:border-brand-600 hover:bg-brand-50"
            >
              <p className="font-semibold text-ink">Ubezpieczeniowy Fundusz Gwarancyjny ↗</p>
              <p className="mt-1 text-sm text-slate-600">Sprawdzenie, czy auto ma ważne OC.</p>
            </a>
          </section>
        </>
      )}

      <section className="card">
        <h2 className="text-lg font-bold">Lista kontrolna przed zakupem auta</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-700">
          {CHECKLIST.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Info({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
