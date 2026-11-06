import { demoExtraction, type Extraction } from "@/lib/ai/extract";
import { aiConfigured, extractFromImage } from "@/lib/ai/openrouter";
import { analyzeQuote } from "@/lib/pricing/engine";
import { getRepair } from "@/lib/pricing/data";
import { takeDailySlot } from "@/lib/rate-limit";
import type { CarClass, QuoteLine, WorkshopType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_CHARS = 8_000_000; // ok. 6 MB po zakodowaniu base64

type Body = {
  mode?: "photo" | "manual";
  image?: string;
  carClass?: CarClass | "auto";
  workshopType?: WorkshopType;
  vehicle?: string;
  workshop?: string;
  lines?: QuoteLine[];
};

const fail = (status: number, error: string) => Response.json({ error }, { status });

function clientId(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "lokalny";
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return fail(400, "Nieprawidłowe dane.");
  }

  const workshopType: WorkshopType = body.workshopType === "aso" ? "aso" : "niezalezny";
  const pickClass = (guess: CarClass | null): CarClass =>
    body.carClass === "mala" || body.carClass === "srednia" || body.carClass === "premium"
      ? body.carClass
      : (guess ?? "srednia");

  if (body.mode === "manual") {
    const lines = (Array.isArray(body.lines) ? body.lines : []).slice(0, 40).map((l) => ({
      repairKey: getRepair(l.repairKey) ? l.repairKey : null,
      description: String(l.description ?? "").slice(0, 200),
      partsPrice: Math.max(0, Number(l.partsPrice) || 0),
      laborPrice: Math.max(0, Number(l.laborPrice) || 0),
    }));
    if (!lines.some((l) => l.partsPrice + l.laborPrice > 0)) return fail(400, "Dodaj co najmniej jedną pozycję z kwotą.");
    const result = analyzeQuote(
      { lines, carClass: pickClass(null), workshopType, vehicle: body.vehicle, workshop: body.workshop },
      { source: "reczna", demo: false },
    );
    return Response.json({ result });
  }

  if (body.mode !== "photo") return fail(400, "Nieznany tryb.");
  if (typeof body.image !== "string" || !body.image.startsWith("data:image/")) return fail(400, "Dołącz zdjęcie wyceny.");
  if (body.image.length > MAX_IMAGE_CHARS) return fail(413, "Zdjęcie jest za duże.");

  let extraction: Extraction;
  const demo = !aiConfigured();
  if (demo) {
    extraction = demoExtraction();
  } else {
    const limit = Number(process.env.DAILY_LIMIT_PER_IP) || 20;
    if (!takeDailySlot(clientId(req), limit)) return fail(429, "Dzienny limit sprawdzeń z tego adresu został wykorzystany. Spróbuj jutro.");
    try {
      extraction = await extractFromImage(body.image);
    } catch (e) {
      console.error("Błąd odczytu AI:", e);
      return fail(502, "Nie udało się odczytać zdjęcia. Spróbuj ponownie albo wpisz pozycje ręcznie.");
    }
  }

  if (extraction.notAQuote || extraction.lines.length === 0) {
    return fail(422, "Na zdjęciu nie widać wyceny ani faktury z warsztatu. Zrób wyraźniejsze zdjęcie całej kartki.");
  }

  const result = analyzeQuote(
    {
      lines: extraction.lines,
      carClass: pickClass(extraction.carClassGuess),
      workshopType,
      vehicle: body.vehicle?.trim() || extraction.vehicle,
      workshop: extraction.workshop,
    },
    { source: "zdjecie", demo },
  );
  return Response.json({ result });
}
