import { decodeVinBasic, pickVpic, type VinOnline } from "@/lib/vin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("vin") ?? "";
  const basic = decodeVinBasic(raw);
  if (!basic.valid) return Response.json({ basic, online: null, onlineError: null });

  let online: VinOnline | null = null;
  let onlineError: string | null = null;
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${basic.vin}?format=json`,
      { signal: AbortSignal.timeout(7000), next: { revalidate: 86400 } },
    );
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as { Results?: Record<string, string>[] };
    online = pickVpic(json.Results?.[0] ?? {});
  } catch {
    onlineError = "Darmowa baza online jest teraz niedostępna – pokazujemy dane odczytane z samego numeru VIN.";
  }
  return Response.json({ basic, online, onlineError });
}
