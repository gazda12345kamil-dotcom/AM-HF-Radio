import { REPAIRS } from "../pricing/data";
import type { CarClass, QuoteLine } from "../types";

/** Wynik odczytu zdjęcia wyceny przez AI (albo tryb demo). */
export interface Extraction {
  vehicle: string | null;
  workshop: string | null;
  carClassGuess: CarClass | null;
  lines: QuoteLine[];
  /** Gdy zdjęcie nie wygląda na wycenę/fakturę z warsztatu. */
  notAQuote: boolean;
}

export const SYSTEM_PROMPT = `Jesteś asystentem, który odczytuje zdjęcia wycen, kosztorysów i faktur z polskich warsztatów samochodowych.
Twoje zadanie: wypisać pozycje i pogrupować je w naprawy. Odpowiadasz WYŁĄCZNIE poprawnym JSON-em, bez komentarzy.

Znane naprawy (pole repairKey musi być jednym z tych kluczy albo null):
${REPAIRS.map((r) => `- ${r.key}: ${r.name} (inne nazwy: ${r.aliases.join(", ")})`).join("\n")}

Zasady:
- Łącz części i robociznę należące do tej samej naprawy w jedną pozycję (np. klocki + tarcze + robocizna hamulców przód => klocki-tarcze-przod).
- Wszystkie kwoty podawaj w złotych BRUTTO (z VAT). Jeśli dokument pokazuje tylko netto, pomnóż przez 1,23.
- partsPrice = suma cen części i materiałów tej naprawy; laborPrice = suma robocizny tej naprawy.
- Jeśli pozycja nie pasuje do żadnego klucza, ustaw repairKey: null i podaj aiEstimate: typowy przedział ceny całej pozycji w Polsce (min, max, zł brutto) oraz krótką notę.
- Pole note: krótkie wyjaśnienie po polsku prostym językiem (maks. 1 zdanie) albo null.
- carClassGuess: "mala", "srednia", "premium" albo null, jeśli z dokumentu nie wynika marka/model.
- Jeśli zdjęcie nie jest wyceną ani fakturą z warsztatu, zwróć notAQuote: true i pustą listę.
- Nie wymyślaj pozycji, których nie ma na dokumencie.

Format odpowiedzi:
{"vehicle": string|null, "workshop": string|null, "carClassGuess": "mala"|"srednia"|"premium"|null, "notAQuote": boolean,
 "lines": [{"repairKey": string|null, "description": string, "partsPrice": number, "laborPrice": number, "laborHours": number|null,
            "aiEstimate": {"min": number, "max": number}|null, "note": string|null}]}`;

const KEYS = new Set(REPAIRS.map((r) => r.key));
const num = (v: unknown) => {
  const n = typeof v === "string" ? Number(v.replace(",", ".").replace(/[^\d.]/g, "")) : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
};
const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Wyciąga JSON z odpowiedzi modelu i sprawdza każde pole — nie ufamy odpowiedzi AI w ciemno. */
export function parseExtraction(raw: string): Extraction {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Odpowiedź AI nie zawiera JSON-a");
  const data = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;

  const rawLines = Array.isArray(data.lines) ? data.lines.slice(0, 40) : [];
  const lines: QuoteLine[] = rawLines.map((item) => {
    const l = (item ?? {}) as Record<string, unknown>;
    const key = typeof l.repairKey === "string" && KEYS.has(l.repairKey) ? l.repairKey : null;
    const est = l.aiEstimate as Record<string, unknown> | null | undefined;
    const aiEstimate = !key && est && num(est.max) > 0 ? { min: num(est.min), max: num(est.max) } : null;
    return {
      repairKey: key,
      description: str(l.description) ?? "Pozycja bez nazwy",
      partsPrice: num(l.partsPrice),
      laborPrice: num(l.laborPrice),
      laborHours: l.laborHours == null ? null : num(l.laborHours),
      aiEstimate,
      note: str(l.note, 300),
    };
  });

  const cls = data.carClassGuess;
  return {
    vehicle: str(data.vehicle, 120),
    workshop: str(data.workshop, 120),
    carClassGuess: cls === "mala" || cls === "srednia" || cls === "premium" ? cls : null,
    notAQuote: data.notAQuote === true,
    lines: lines.filter((l) => l.partsPrice + l.laborPrice > 0),
  };
}

/** Przykładowy odczyt używany, gdy nie ma klucza OpenRouter. */
export function demoExtraction(): Extraction {
  return {
    vehicle: "Škoda Octavia III 2.0 TDI (przykład)",
    workshop: "Auto-Serwis Przykładowy",
    carClassGuess: "srednia",
    notAQuote: false,
    lines: [
      { repairKey: "klocki-tarcze-przod", description: "Tarcze + klocki przód TRW, robocizna", partsPrice: 690, laborPrice: 260 },
      { repairKey: "olej-filtr", description: "Olej 5W-30 VW 507.00 4,7 l + filtr oleju", partsPrice: 330, laborPrice: 90 },
      { repairKey: "filtr-kabinowy", description: "Filtr kabinowy węglowy", partsPrice: 95, laborPrice: 60 },
      { repairKey: "plyn-hamulcowy", description: "Wymiana płynu hamulcowego DOT4", partsPrice: 45, laborPrice: 240 },
      {
        repairKey: null,
        description: "Czyszczenie i smarowanie prowadnic zacisków",
        partsPrice: 0,
        laborPrice: 120,
        aiEstimate: { min: 50, max: 150 },
        note: "Często robione przy wymianie klocków – bywa wliczone w cenę.",
      },
    ],
  };
}
