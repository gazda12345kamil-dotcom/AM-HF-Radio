import { decodeVinBasic, pickVpic, type VinBasic, type VinOnline } from "./vin";

export type VinResponse = { basic: VinBasic; online: VinOnline | null; onlineError: string | null };

/** Dekoduje VIN i próbuje pobrać szczegóły z darmowej bazy NHTSA vPIC. */
export async function checkVin(raw: string): Promise<VinResponse> {
  const basic = decodeVinBasic(raw);
  if (!basic.valid) return { basic, online: null, onlineError: null };
  try {
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${basic.vin}?format=json`, {
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as { Results?: Record<string, string>[] };
    return { basic, online: pickVpic(json.Results?.[0] ?? {}), onlineError: null };
  } catch {
    return {
      basic,
      online: null,
      onlineError: "Darmowa baza online jest teraz niedostępna – pokazujemy dane odczytane z samego numeru VIN.",
    };
  }
}
