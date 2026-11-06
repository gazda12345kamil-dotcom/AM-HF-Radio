import { PARTS_QUERY } from "./pricing/data";
import type { LineResult } from "./types";

export interface ShopLink {
  label: string;
  url: string;
}

/** Usuwa z opisu auta dopiski w nawiasach, np. „(przykład)”. */
const cleanVehicle = (v: string | null) => (v ?? "").replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();

/**
 * Linki do wyszukiwania części w sklepach. To zwykłe linki do wyników wyszukiwania –
 * nie pobieramy cen z tych serwisów (regulamin API Allegro na to nie pozwala).
 */
export function partsSearchLinks(line: LineResult, vehicle: string | null): ShopLink[] {
  if (line.repairKey && !PARTS_QUERY[line.repairKey]) return []; // usługa bez części
  if (!line.repairKey && line.partsPrice <= 0) return [];
  const part = line.repairKey ? PARTS_QUERY[line.repairKey] : line.description;
  const q = [part, cleanVehicle(vehicle)].filter(Boolean).join(" ").slice(0, 120);
  const enc = encodeURIComponent(q);
  return [
    { label: "Allegro", url: `https://allegro.pl/listing?string=${enc}` },
    { label: "Google Zakupy", url: `https://www.google.com/search?tbm=shop&q=${enc}` },
  ];
}
