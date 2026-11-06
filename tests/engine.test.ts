import { describe, expect, it } from "vitest";
import { analyzeQuote, expectedFor, judge } from "@/lib/pricing/engine";
import { REPAIRS, getRepair } from "@/lib/pricing/data";

const base = { carClass: "srednia" as const, workshopType: "niezalezny" as const };

describe("judge", () => {
  const r = { min: 500, max: 1000 };
  it("ocenia kwoty względem przedziału", () => {
    expect(judge(300, r)).toBe("tanio");
    expect(judge(450, r)).toBe("ok"); // powyżej 85% minimum
    expect(judge(1000, r)).toBe("ok");
    expect(judge(1150, r)).toBe("drozej");
    expect(judge(1300, r)).toBe("drogo");
    expect(judge(100, null)).toBe("brak-danych");
    expect(judge(0, r)).toBe("brak-danych");
  });
});

describe("expectedFor", () => {
  it("liczy części i robociznę dla auta średniego w niezależnym warsztacie", () => {
    const e = expectedFor(getRepair("klocki-tarcze-przod")!, base);
    expect(e.parts).toEqual({ min: 320, max: 850 });
    expect(e.labor).toEqual({ min: 130, max: 370 }); // 1h*130 .. 1.6h*230 = 368 -> 370
    expect(e.total).toEqual({ min: 450, max: 1220 });
  });

  it("ASO i auto premium są droższe", () => {
    const ref = getRepair("rozrzad")!;
    const normal = expectedFor(ref, base).total;
    const aso = expectedFor(ref, { carClass: "premium", workshopType: "aso" }).total;
    expect(aso.min).toBeGreaterThan(normal.min);
    expect(aso.max).toBeGreaterThan(normal.max);
  });

  it("usługi ryczałtowe nie mają części", () => {
    const e = expectedFor(getRepair("geometria")!, base);
    expect(e.parts).toBeNull();
    expect(e.total).toEqual({ min: 120, max: 280 });
  });

  it("każda pozycja w bazie ma sensowne dane", () => {
    for (const r of REPAIRS) {
      expect(Boolean(r.flat) || Boolean(r.parts || r.hours), r.key).toBe(true);
      const e = expectedFor(r, base);
      expect(e.total.max, r.key).toBeGreaterThan(e.total.min);
    }
  });
});

describe("analyzeQuote", () => {
  it("wykrywa przepłatę i sumuje tylko ocenione pozycje", () => {
    const res = analyzeQuote(
      {
        ...base,
        lines: [
          { repairKey: "olej-filtr", description: "Olej", partsPrice: 900, laborPrice: 300 },
          { repairKey: null, description: "Coś nietypowego", partsPrice: 0, laborPrice: 200 },
        ],
      },
      { source: "reczna", demo: false },
    );
    expect(res.total).toBe(1200 + 200);
    expect(res.pricedTotal).toBe(1200);
    expect(res.verdict).toBe("drogo");
    expect(res.overpay).toBeGreaterThan(0);
    expect(res.lines[1].verdict).toBe("brak-danych");
    expect(res.summary).toContain("Nie udało się ocenić pozycji: 1");
  });

  it("używa szacunku AI dla pozycji spoza bazy", () => {
    const res = analyzeQuote(
      { ...base, lines: [{ repairKey: null, description: "X", partsPrice: 0, laborPrice: 100, aiEstimate: { min: 50, max: 150 } }] },
      { source: "zdjecie", demo: false },
    );
    expect(res.lines[0].source).toBe("ai");
    expect(res.verdict).toBe("ok");
    expect(res.overpay).toBe(0);
  });

  it("uczciwa wycena dostaje ocenę ok", () => {
    const res = analyzeQuote(
      { ...base, lines: [{ repairKey: "klocki-tarcze-przod", description: "", partsPrice: 600, laborPrice: 250 }] },
      { source: "reczna", demo: false },
    );
    expect(res.verdict).toBe("ok");
    expect(res.questions.length).toBeGreaterThan(0);
  });
});

describe("zawyżona robocizna przy normalnej sumie", () => {
  it("podnosi ocenę pozycji do 'trochę drożej' i wspomina o tym w podsumowaniu", () => {
    const res = analyzeQuote(
      { ...base, lines: [
        { repairKey: "rozrzad", description: "", partsPrice: 1200, laborPrice: 1700 },
        { repairKey: "olej-filtr", description: "", partsPrice: 250, laborPrice: 100 },
        { repairKey: "sprzeglo", description: "", partsPrice: 900, laborPrice: 800 },
      ] },
      { source: "reczna", demo: false },
    );
    expect(res.lines[0].verdict).toBe("drozej");
    expect(res.lines[1].verdict).toBe("ok");
    expect(res.verdict).toBe("ok");
    expect(res.summary).toContain("oznaczone jako droższe");
  });
});
