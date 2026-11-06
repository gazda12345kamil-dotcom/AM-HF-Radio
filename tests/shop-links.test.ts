import { describe, expect, it } from "vitest";
import { analyzeQuote } from "@/lib/pricing/engine";
import { partsSearchLinks } from "@/lib/shop-links";

const res = analyzeQuote(
  {
    carClass: "srednia",
    workshopType: "niezalezny",
    vehicle: "Škoda Octavia III (przykład)",
    lines: [
      { repairKey: "klocki-tarcze-przod", description: "", partsPrice: 600, laborPrice: 200 },
      { repairKey: "geometria", description: "", partsPrice: 0, laborPrice: 200 },
      { repairKey: null, description: "Czujnik ABS", partsPrice: 150, laborPrice: 80 },
      { repairKey: null, description: "Mycie silnika", partsPrice: 0, laborPrice: 80 },
    ],
  },
  { source: "reczna", demo: false },
);

describe("partsSearchLinks", () => {
  it("buduje linki z frazą części i modelem auta (bez dopisków w nawiasach)", () => {
    const links = partsSearchLinks(res.lines[0], res.vehicle);
    expect(links.map((l) => l.label)).toEqual(["Allegro", "Google Zakupy"]);
    expect(decodeURIComponent(links[0].url)).toBe(
      "https://allegro.pl/listing?string=tarcze klocki hamulcowe przód komplet Škoda Octavia III",
    );
  });

  it("pomija usługi bez części", () => {
    expect(partsSearchLinks(res.lines[1], res.vehicle)).toEqual([]);
    expect(partsSearchLinks(res.lines[3], res.vehicle)).toEqual([]);
  });

  it("dla pozycji spoza bazy używa jej opisu", () => {
    expect(decodeURIComponent(partsSearchLinks(res.lines[2], null)[0].url)).toContain("string=Czujnik ABS");
  });
});
