/** Prosty licznik dzienny w pamięci serwera (na jedną instancję). Chroni klucz AI przed nadużyciami. */
const hits = new Map<string, { day: string; count: number }>();

export function takeDailySlot(id: string, limit: number): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const entry = hits.get(id);
  if (!entry || entry.day !== day) {
    if (hits.size > 10_000) hits.clear();
    hits.set(id, { day, count: 1 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
