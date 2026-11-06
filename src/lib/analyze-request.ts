import { demoExtraction, type Extraction } from "./ai/extract";
import { getRepair } from "./pricing/data";
import { analyzeQuote } from "./pricing/engine";
import type { AnalysisResult, CarClass, QuoteLine, WorkshopType } from "./types";

/** Dane wysyłane z formularza „Sprawdź wycenę”. */
export type AnalyzeBody = {
  mode?: "photo" | "manual";
  image?: string;
  carClass?: CarClass | "auto";
  workshopType?: WorkshopType;
  vehicle?: string;
  workshop?: string;
  lines?: QuoteLine[];
};

export type AnalyzeOutcome = { status: number; result?: AnalysisResult; error?: string };

const MAX_IMAGE_CHARS = 8_000_000; // ok. 6 MB po zakodowaniu base64

/**
 * Wspólna logika oceny wyceny – używa jej serwer (API) i wersja działająca w samej przeglądarce.
 * `extract` odczytuje zdjęcie; gdy go brak, używany jest przykładowy odczyt (tryb demo).
 */
export async function handleAnalyze(
  body: AnalyzeBody,
  extract: ((image: string) => Promise<Extraction>) | null,
): Promise<AnalyzeOutcome> {
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
    if (!lines.some((l) => l.partsPrice + l.laborPrice > 0)) {
      return { status: 400, error: "Dodaj co najmniej jedną pozycję z kwotą." };
    }
    const result = analyzeQuote(
      { lines, carClass: pickClass(null), workshopType, vehicle: body.vehicle, workshop: body.workshop },
      { source: "reczna", demo: false },
    );
    return { status: 200, result };
  }

  if (body.mode !== "photo") return { status: 400, error: "Nieznany tryb." };
  if (typeof body.image !== "string" || !body.image.startsWith("data:image/")) {
    return { status: 400, error: "Dołącz zdjęcie wyceny." };
  }
  if (body.image.length > MAX_IMAGE_CHARS) return { status: 413, error: "Zdjęcie jest za duże." };

  let extraction: Extraction;
  if (!extract) {
    extraction = demoExtraction();
  } else {
    try {
      extraction = await extract(body.image);
    } catch (e) {
      console.error("Błąd odczytu AI:", e);
      return { status: 502, error: "Nie udało się odczytać zdjęcia. Spróbuj ponownie albo wpisz pozycje ręcznie." };
    }
  }

  if (extraction.notAQuote || extraction.lines.length === 0) {
    return {
      status: 422,
      error: "Na zdjęciu nie widać wyceny ani faktury z warsztatu. Zrób wyraźniejsze zdjęcie całej kartki.",
    };
  }

  const result = analyzeQuote(
    {
      lines: extraction.lines,
      carClass: pickClass(extraction.carClassGuess),
      workshopType,
      vehicle: body.vehicle?.trim() || extraction.vehicle,
      workshop: extraction.workshop,
    },
    { source: "zdjecie", demo: !extract },
  );
  return { status: 200, result };
}
