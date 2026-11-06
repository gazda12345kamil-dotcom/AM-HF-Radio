/**
 * Dekodowanie numeru VIN bez żadnych płatnych baz:
 * - sprawdzenie poprawności,
 * - producent i kraj z prefiksu (WMI),
 * - możliwy rok modelowy (10. znak),
 * - cyfra kontrolna (obowiązkowa w Ameryce Płn., w Europie często pomijana).
 */

const VALID = /^[A-HJ-NPR-Z0-9]{17}$/;

const WMI: Record<string, string> = {
  // Niemcy
  WVW: "Volkswagen", WV1: "Volkswagen (dostawcze)", WV2: "Volkswagen (dostawcze)", WVG: "Volkswagen (SUV)",
  WAU: "Audi", WUA: "Audi (quattro GmbH)", WBA: "BMW", WBS: "BMW M", WBY: "BMW (elektryczne)",
  WDB: "Mercedes-Benz", WDD: "Mercedes-Benz", WDC: "Mercedes-Benz (SUV)", WDF: "Mercedes-Benz (dostawcze)",
  W1K: "Mercedes-Benz", W1N: "Mercedes-Benz (SUV)", W1V: "Mercedes-Benz (dostawcze)",
  W0L: "Opel", W0V: "Opel", WF0: "Ford (Niemcy)", WMW: "MINI", WME: "smart", WP0: "Porsche", WP1: "Porsche (SUV)",
  // Francja
  VF1: "Renault", VF3: "Peugeot", VF7: "Citroën", VR3: "Peugeot", VR7: "Citroën", VR1: "DS",
  VXK: "Opel (Stellantis)", VNK: "Toyota (Francja)", VF6: "Renault Trucks",
  // Hiszpania
  VSS: "SEAT", VS6: "Ford (Hiszpania)", VSK: "Nissan (Hiszpania)", VWV: "Volkswagen (Hiszpania)",
  // Włochy
  ZFA: "Fiat", ZFF: "Ferrari", ZAR: "Alfa Romeo", ZLA: "Lancia", ZHW: "Lamborghini", ZAM: "Maserati",
  // Czechy, Słowacja, Węgry, Rumunia, Polska
  TMB: "Škoda", TMA: "Hyundai (Czechy)", TMK: "Kia/Hyundai (Czechy)", TRU: "Audi (Węgry)", TSM: "Suzuki (Węgry)",
  U5Y: "Kia (Słowacja)", UU1: "Dacia", SUF: "Fiat (Polska)", SUP: "Polska (inny producent)",
  // Szwecja, Wielka Brytania
  YV1: "Volvo", YV4: "Volvo (SUV)", YS3: "Saab", SAL: "Land Rover", SAJ: "Jaguar", SCC: "Lotus",
  SB1: "Toyota (Wielka Brytania)", SJN: "Nissan (Wielka Brytania)", SHH: "Honda (Wielka Brytania)", SHS: "Honda (Wielka Brytania)",
  // Azja
  JTD: "Toyota", JTE: "Toyota", JTN: "Toyota", JT2: "Toyota", JTM: "Toyota (SUV)", JMZ: "Mazda", JM1: "Mazda",
  JN1: "Nissan", JN8: "Nissan (SUV)", JHM: "Honda", JF1: "Subaru", JF2: "Subaru", JS2: "Suzuki", JSA: "Suzuki",
  JMB: "Mitsubishi", JMY: "Mitsubishi", KNA: "Kia", KNE: "Kia (eksport)", KMH: "Hyundai", KMF: "Hyundai (dostawcze)",
  NMT: "Toyota (Turcja)", NM0: "Ford (Turcja)", LRW: "Tesla (Chiny)", LVS: "Ford (Chiny)",
  // Ameryka
  "5YJ": "Tesla", "7SA": "Tesla", "1FA": "Ford (USA)", "1FT": "Ford (USA)", "1G1": "Chevrolet (USA)",
  "1C4": "Chrysler/Jeep (USA)", "1J4": "Jeep (USA)", "2T1": "Toyota (Kanada)", "3VW": "Volkswagen (Meksyk)",
};

function countryOf(vin: string): string {
  const a = vin[0];
  const ab = vin.slice(0, 2);
  if (a === "W") return "Niemcy";
  if (ab >= "VA" && ab <= "VE") return "Austria";
  if (ab >= "VF" && ab <= "VR") return "Francja";
  if (ab >= "VS" && ab <= "VW") return "Hiszpania";
  if (a === "Z") return "Włochy";
  if (ab >= "TJ" && ab <= "TP") return "Czechy";
  if (ab >= "TR" && ab <= "TV") return "Węgry";
  if (ab >= "SU" && ab <= "SZ") return "Polska";
  if (ab >= "SA" && ab <= "SM") return "Wielka Brytania";
  if (ab >= "YA" && ab <= "YE") return "Belgia";
  if (ab >= "YS" && ab <= "YW") return "Szwecja";
  if (ab >= "U5" && ab <= "U7") return "Słowacja";
  if (ab >= "UU" && ab <= "UZ") return "Rumunia";
  if (a === "J") return "Japonia";
  if (a === "K") return "Korea Płd.";
  if (a === "L") return "Chiny";
  if (a === "N") return "Turcja";
  if (a === "1" || a === "4" || a === "5" || a === "7") return "USA";
  if (a === "2") return "Kanada";
  if (a === "3") return "Meksyk";
  return "nieznany";
}

const YEAR_CODES = "ABCDEFGHJKLMNPRSTVWXY";

/** Najbardziej prawdopodobny rok modelowy z 10. znaku (kod powtarza się co 30 lat). */
export function modelYear(vin: string, now = new Date()): number | null {
  const c = vin[9];
  const maxYear = now.getFullYear() + 1;
  if (c >= "1" && c <= "9") {
    const y = 2000 + Number(c);
    return y + 30 <= maxYear ? y + 30 : y;
  }
  const i = YEAR_CODES.indexOf(c);
  if (i < 0) return null;
  const recent = 2010 + i;
  return recent <= maxYear ? recent : 1980 + i;
}

const TRANSLIT: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export function checkDigitOk(vin: string): boolean {
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = vin[i];
    const v = ch >= "0" && ch <= "9" ? Number(ch) : TRANSLIT[ch];
    sum += v * WEIGHTS[i];
  }
  const r = sum % 11;
  return vin[8] === (r === 10 ? "X" : String(r));
}

export function normalizeVin(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export interface VinBasic {
  vin: string;
  valid: boolean;
  error: string | null;
  manufacturer: string | null;
  country: string | null;
  modelYear: number | null;
  checkDigitOk: boolean | null;
  serial: string | null;
}

export function decodeVinBasic(input: string): VinBasic {
  const vin = normalizeVin(input);
  const empty = { vin, manufacturer: null, country: null, modelYear: null, checkDigitOk: null, serial: null };
  if (vin.length !== 17) {
    return { ...empty, valid: false, error: `VIN musi mieć 17 znaków (wpisano ${vin.length}).` };
  }
  if (!VALID.test(vin)) {
    return {
      ...empty,
      valid: false,
      error: "VIN zawiera niedozwolone znaki. Litery I, O i Q nigdy nie występują w VIN (to zwykle 1 i 0).",
    };
  }
  return {
    vin,
    valid: true,
    error: null,
    manufacturer: WMI[vin.slice(0, 3)] ?? null,
    country: countryOf(vin),
    modelYear: modelYear(vin),
    checkDigitOk: checkDigitOk(vin),
    serial: vin.slice(11),
  };
}

/** Wybrane pola z darmowej bazy NHTSA vPIC (najlepsze dane dla aut z rynku USA, dla Europy częściowe). */
export interface VinOnline {
  make?: string;
  model?: string;
  modelYear?: string;
  body?: string;
  fuel?: string;
  engineL?: string;
  engineHp?: string;
  plantCountry?: string;
}

export function pickVpic(row: Record<string, string | null | undefined>): VinOnline {
  const v = (k: string) => {
    const s = row[k]?.toString().trim();
    return s && s !== "0" && s.toLowerCase() !== "not applicable" ? s : undefined;
  };
  const out: VinOnline = {
    make: v("Make"),
    model: v("Model"),
    modelYear: v("ModelYear"),
    body: v("BodyClass"),
    fuel: v("FuelTypePrimary"),
    engineL: v("DisplacementL"),
    engineHp: v("EngineHP"),
    plantCountry: v("PlantCountry"),
  };
  return Object.fromEntries(Object.entries(out).filter(([, val]) => val)) as VinOnline;
}
