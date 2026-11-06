export type PlanId = "darmowy" | "kierowca" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  /** Ile zdjęć wycen miesięcznie odczytuje AI. Ręczne wpisanie i sprawdzanie VIN są bez limitu. */
  photoChecks: number;
  forWhom: string;
  features: string[];
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "darmowy",
    name: "Darmowy",
    priceMonthly: 0,
    photoChecks: 3,
    forWhom: "Na okazjonalną wizytę u mechanika",
    features: [
      "3 sprawdzenia zdjęć wycen miesięcznie",
      "Ręczne sprawdzanie wycen bez limitu",
      "Sprawdzanie auta po VIN bez limitu",
      "Historia sprawdzeń na tym urządzeniu",
    ],
  },
  {
    id: "kierowca",
    name: "Kierowca",
    priceMonthly: 14.99,
    photoChecks: 30,
    forWhom: "Dla rodziny z jednym lub dwoma autami",
    features: ["30 sprawdzeń zdjęć wycen miesięcznie", "Wszystko z planu Darmowego", "Pierwszeństwo w nowych funkcjach"],
    highlight: true,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 49,
    photoChecks: 300,
    forWhom: "Dla firm z flotą, handlarzy i komisów",
    features: ["300 sprawdzeń zdjęć wycen miesięcznie", "Wszystko z planu Kierowca", "Wsparcie e-mail"],
  },
];

export function getPlan(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export const formatPrice = (n: number) =>
  n === 0 ? "0 zł" : `${n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
