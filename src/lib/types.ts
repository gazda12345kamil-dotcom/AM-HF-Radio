export type CarClass = "mala" | "srednia" | "premium";
export type WorkshopType = "niezalezny" | "aso";
export type Urgency = "pilne" | "wkrotce" | "moze-poczekac";
export type Verdict = "tanio" | "ok" | "drozej" | "drogo" | "brak-danych";
export type Range = { min: number; max: number };

/** Jedna pozycja w bazie cen: typowa naprawa dla auta klasy średniej. */
export interface RepairRef {
  key: string;
  name: string;
  /** Inne nazwy, pod którymi naprawa pojawia się na wycenach (podpowiedź dla AI). */
  aliases: string[];
  /** Cena części w zł brutto dla auta klasy średniej. */
  parts: [number, number] | null;
  /** Czas pracy w roboczogodzinach. */
  hours: [number, number] | null;
  /** Usługa w cenie ryczałtowej (np. geometria), zł brutto. */
  flat?: [number, number];
  whatIsIt: string;
  urgency: Urgency;
  canDrive: string;
  questions: string[];
}

/** Pozycja wyceny po odczytaniu (ze zdjęcia albo wpisana ręcznie). */
export interface QuoteLine {
  repairKey: string | null;
  description: string;
  /** zł brutto */
  partsPrice: number;
  /** zł brutto */
  laborPrice: number;
  laborHours?: number | null;
  /** Szacunek AI dla pozycji spoza bazy, zł brutto razem. */
  aiEstimate?: Range | null;
  note?: string | null;
}

export interface QuoteInput {
  lines: QuoteLine[];
  carClass: CarClass;
  workshopType: WorkshopType;
  vehicle?: string | null;
  workshop?: string | null;
}

export interface RepairInfo {
  whatIsIt: string;
  urgency: Urgency;
  canDrive: string;
}

export interface LineResult {
  description: string;
  repairKey: string | null;
  repairName: string;
  partsPrice: number;
  laborPrice: number;
  charged: number;
  expected: Range | null;
  partsExpected: Range | null;
  laborExpected: Range | null;
  verdict: Verdict;
  source: "baza" | "ai" | "brak";
  info: RepairInfo | null;
  note: string | null;
}

export interface AnalysisResult {
  id: string;
  createdAt: string;
  source: "zdjecie" | "reczna";
  demo: boolean;
  vehicle: string | null;
  workshop: string | null;
  carClass: CarClass;
  workshopType: WorkshopType;
  lines: LineResult[];
  total: number;
  /** Suma pozycji, które dało się ocenić. */
  pricedTotal: number;
  expectedTotal: Range | null;
  verdict: Verdict;
  /** O ile więcej niż górna granica typowej ceny (0, jeśli nie przepłacasz). */
  overpay: number;
  summary: string;
  questions: string[];
}
