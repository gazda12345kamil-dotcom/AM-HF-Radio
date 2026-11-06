import { describe, expect, it } from "vitest";
import { checkDigitOk, decodeVinBasic, modelYear, pickVpic } from "@/lib/vin";

describe("decodeVinBasic", () => {
  it("odrzuca złą długość i niedozwolone litery", () => {
    expect(decodeVinBasic("WVWZZZ1K").valid).toBe(false);
    const withO = decodeVinBasic("WVWZZZ1KZAWO00001");
    expect(withO.valid).toBe(false);
    expect(withO.error).toContain("I, O i Q");
  });

  it("rozpoznaje producenta, kraj i rok", () => {
    const r = decodeVinBasic("wvw zzz1kz-aw000001");
    expect(r.valid).toBe(true);
    expect(r.vin).toBe("WVWZZZ1KZAW000001");
    expect(r.manufacturer).toBe("Volkswagen");
    expect(r.country).toBe("Niemcy");
    expect(r.modelYear).toBe(2010);
  });

  it("rozpoznaje kraje spoza Niemiec", () => {
    expect(decodeVinBasic("TMBJJ7NE8J0000001").country).toBe("Czechy");
    expect(decodeVinBasic("VF1RFB00000000001").manufacturer).toBe("Renault");
    expect(decodeVinBasic("UU1SDAAH000000001").country).toBe("Rumunia");
  });
});

describe("checkDigitOk", () => {
  it("sprawdza cyfrę kontrolną (przykład z normy)", () => {
    expect(checkDigitOk("1M8GDM9AXKP042788")).toBe(true);
    expect(checkDigitOk("1M8GDM9A1KP042788")).toBe(false);
  });
});

describe("modelYear", () => {
  const now = new Date("2026-11-06");
  it("wybiera najbliższy rok, który nie jest z przyszłości", () => {
    expect(modelYear("XXXXXXXXXTXXXXXXX", now)).toBe(2026);
    expect(modelYear("XXXXXXXXXVXXXXXXX", now)).toBe(2027);
    expect(modelYear("XXXXXXXXXWXXXXXXX", now)).toBe(1998);
    expect(modelYear("XXXXXXXXX5XXXXXXX", now)).toBe(2005);
    expect(modelYear("XXXXXXXXX0XXXXXXX", now)).toBeNull();
  });
});

describe("pickVpic", () => {
  it("pomija puste i nieistotne pola", () => {
    expect(pickVpic({ Make: "TESLA", Model: "Model 3", BodyClass: "", EngineHP: "0", FuelTypePrimary: "Not Applicable" })).toEqual({
      make: "TESLA",
      model: "Model 3",
    });
  });
});
