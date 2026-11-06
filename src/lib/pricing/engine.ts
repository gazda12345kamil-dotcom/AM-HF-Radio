import type { AnalysisResult, LineResult, QuoteInput, QuoteLine, Range, RepairRef, Verdict } from "../types";
import { ASO_FLAT_FACTOR, CLASS_FACTOR, LABOR_RATE, getRepair } from "./data";

const round10 = (n: number) => Math.round(n / 10) * 10;
const roundRange = (r: Range): Range => ({ min: round10(r.min), max: round10(r.max) });
const scale = (pair: [number, number], k: number): Range => ({ min: pair[0] * k, max: pair[1] * k });

/** Typowe ceny dla jednej naprawy z bazy, z uwzględnieniem klasy auta i rodzaju warsztatu. */
export function expectedFor(ref: RepairRef, input: Pick<QuoteInput, "carClass" | "workshopType">) {
  const f = CLASS_FACTOR[input.carClass];
  if (ref.flat) {
    const k = f.flat * (input.workshopType === "aso" ? ASO_FLAT_FACTOR : 1);
    const labor = roundRange(scale(ref.flat, k));
    return { parts: null, labor, total: labor };
  }
  const parts = ref.parts ? roundRange(scale(ref.parts, f.parts)) : null;
  let labor: Range | null = null;
  if (ref.hours) {
    const [rMin, rMax] = LABOR_RATE[input.workshopType];
    labor = roundRange({ min: ref.hours[0] * f.hours * rMin, max: ref.hours[1] * f.hours * rMax });
  }
  const total: Range = {
    min: (parts?.min ?? 0) + (labor?.min ?? 0),
    max: (parts?.max ?? 0) + (labor?.max ?? 0),
  };
  return { parts, labor, total };
}

/** Porównuje kwotę z przedziałem typowych cen. */
export function judge(charged: number, range: Range | null): Verdict {
  if (!range || charged <= 0) return "brak-danych";
  if (charged < range.min * 0.85) return "tanio";
  if (charged <= range.max) return "ok";
  if (charged <= range.max * 1.2) return "drozej";
  return "drogo";
}

const RANK: Record<Verdict, number> = { "brak-danych": -1, tanio: 0, ok: 1, drozej: 2, drogo: 3 };

function analyzeLine(line: QuoteLine, input: QuoteInput): LineResult {
  const ref = getRepair(line.repairKey);
  const charged = Math.max(0, (line.partsPrice || 0) + (line.laborPrice || 0));
  const base = {
    description: line.description || ref?.name || "Pozycja bez nazwy",
    repairKey: ref ? ref.key : null,
    partsPrice: line.partsPrice || 0,
    laborPrice: line.laborPrice || 0,
    charged,
    note: line.note ?? null,
  };

  if (ref) {
    const exp = expectedFor(ref, input);
    let verdict = judge(charged, exp.total);
    // Suma może mieścić się w normie, a sama robocizna lub części być zawyżone – wtedy ostrzegamy łagodnie.
    if (!ref.flat && verdict !== "drogo" && base.partsPrice > 0 && base.laborPrice > 0) {
      const parts = judge(base.partsPrice, exp.parts);
      const labor = judge(base.laborPrice, exp.labor);
      const componentHigh = RANK[parts] >= RANK.drozej || RANK[labor] >= RANK.drozej;
      if (componentHigh && RANK[verdict] < RANK.drozej) verdict = "drozej";
    }
    return {
      ...base,
      repairName: ref.name,
      expected: exp.total,
      partsExpected: exp.parts,
      laborExpected: exp.labor,
      verdict,
      source: "baza",
      info: { whatIsIt: ref.whatIsIt, urgency: ref.urgency, canDrive: ref.canDrive },
    };
  }

  const ai = line.aiEstimate && line.aiEstimate.max > 0 ? roundRange(line.aiEstimate) : null;
  return {
    ...base,
    repairName: base.description,
    expected: ai,
    partsExpected: null,
    laborExpected: null,
    verdict: judge(charged, ai),
    source: ai ? "ai" : "brak",
    info: null,
  };
}

const GENERAL_QUESTIONS = [
  "Czy podane ceny zawierają VAT?",
  "Czy mogę dostać stare części do wglądu?",
];

function summaryFor(verdict: Verdict, overpay: number, unpriced: number): string {
  const tail = unpriced > 0 ? ` Nie udało się ocenić pozycji: ${unpriced}.` : "";
  switch (verdict) {
    case "ok":
      return "Cena wygląda uczciwie – mieści się w typowym przedziale dla Twojego auta." + tail;
    case "tanio":
      return "Wycena jest niższa niż zwykle. To dobra wiadomość, ale zapytaj, jakiej jakości części zostaną użyte." + tail;
    case "drozej":
      return `Wycena jest trochę wyższa niż typowa (ok. ${overpay} zł ponad górną granicę). Warto dopytać o szczegóły albo porównać z innym warsztatem.` + tail;
    case "drogo":
      return `Wycena jest wyraźnie wyższa niż typowa – ok. ${overpay} zł ponad górną granicę. Warto poprosić o inną ofertę.` + tail;
    default:
      return "Nie udało się ocenić żadnej pozycji – brak danych w bazie cen.";
  }
}

export function analyzeQuote(
  input: QuoteInput,
  meta: { source: "zdjecie" | "reczna"; demo: boolean },
): AnalysisResult {
  const lines = input.lines.map((l) => analyzeLine(l, input));
  const priced = lines.filter((l) => l.verdict !== "brak-danych" && l.expected);
  const total = lines.reduce((s, l) => s + l.charged, 0);
  const pricedTotal = priced.reduce((s, l) => s + l.charged, 0);
  const expectedTotal: Range | null = priced.length
    ? priced.reduce((s, l) => ({ min: s.min + l.expected!.min, max: s.max + l.expected!.max }), { min: 0, max: 0 })
    : null;
  const verdict = judge(pricedTotal, expectedTotal);
  const overpay = expectedTotal ? Math.max(0, round10(pricedTotal - expectedTotal.max)) : 0;

  const questions: string[] = [];
  for (const l of lines) {
    for (const q of getRepair(l.repairKey)?.questions ?? []) if (!questions.includes(q)) questions.push(q);
  }
  questions.push(...GENERAL_QUESTIONS);

  return {
    id: globalThis.crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source: meta.source,
    demo: meta.demo,
    vehicle: input.vehicle?.trim() || null,
    workshop: input.workshop?.trim() || null,
    carClass: input.carClass,
    workshopType: input.workshopType,
    lines,
    total,
    pricedTotal,
    expectedTotal,
    verdict,
    overpay,
    summary:
      summaryFor(verdict, overpay, lines.length - priced.length) +
      (RANK[verdict] < RANK.drozej && lines.some((l) => RANK[l.verdict] >= RANK.drozej)
        ? " Zwróć uwagę na pozycje oznaczone jako droższe."
        : ""),
    questions: questions.slice(0, 8),
  };
}
