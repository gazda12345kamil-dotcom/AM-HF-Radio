import { describe, expect, it } from "vitest";
import { demoExtraction, parseExtraction } from "@/lib/ai/extract";

describe("parseExtraction", () => {
  it("czyta JSON w bloku kodu i czyści dane", () => {
    const raw = "```json\n" + JSON.stringify({
      vehicle: "Golf",
      workshop: null,
      carClassGuess: "kosmiczna",
      notAQuote: false,
      lines: [
        { repairKey: "olej-filtr", description: "Olej", partsPrice: "250,50 zł", laborPrice: 80 },
        { repairKey: "nieistniejacy", description: "Coś", partsPrice: 0, laborPrice: 100, aiEstimate: { min: 50, max: 120 } },
        { repairKey: "olej-filtr", description: "Pusta", partsPrice: 0, laborPrice: 0 },
        { repairKey: "olej-filtr", description: "Ujemna", partsPrice: -50, laborPrice: 10 },
      ],
    }) + "\n```";
    const e = parseExtraction(raw);
    expect(e.vehicle).toBe("Golf");
    expect(e.carClassGuess).toBeNull();
    expect(e.lines).toHaveLength(3);
    expect(e.lines[0].partsPrice).toBe(250.5);
    expect(e.lines[1].repairKey).toBeNull();
    expect(e.lines[1].aiEstimate).toEqual({ min: 50, max: 120 });
    expect(e.lines[2].partsPrice).toBe(0);
  });

  it("zgłasza błąd, gdy nie ma JSON-a", () => {
    expect(() => parseExtraction("Przepraszam, nie mogę")).toThrow();
  });

  it("dane demo są kompletne", () => {
    expect(demoExtraction().lines.length).toBeGreaterThan(3);
  });
});
