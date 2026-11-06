import { VERDICT, zl } from "@/lib/format";
import type { Range, Verdict } from "@/lib/types";

export function VerdictBadge({ verdict, large = false }: { verdict: Verdict; large?: boolean }) {
  const v = VERDICT[verdict];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${v.badge} ${
        large ? "px-4 py-1.5 text-base" : "px-2.5 py-0.5 text-xs"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${v.bar}`} />
      {v.label}
    </span>
  );
}

/** Pasek: zielony zakres to typowa cena, kreska to kwota z wyceny. */
export function PriceBar({ charged, range, verdict }: { charged: number; range: Range | null; verdict: Verdict }) {
  if (!range) return null;
  const top = Math.max(charged, range.max) * 1.15 || 1;
  const pct = (n: number) => `${Math.min(100, (n / top) * 100)}%`;
  return (
    <div className="mt-3">
      <div className="relative h-3 rounded-full bg-slate-100">
        <div
          className="absolute h-3 rounded-full bg-emerald-200"
          style={{ left: pct(range.min), width: `calc(${pct(range.max)} - ${pct(range.min)})` }}
        />
        <div
          className={`absolute -top-1 h-5 w-1.5 -translate-x-1/2 rounded-full ${VERDICT[verdict].bar}`}
          style={{ left: pct(charged) }}
          title={`Wycena: ${zl(charged)}`}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>typowo {zl(range.min)} – {zl(range.max)}</span>
        <span className="font-medium text-slate-700">wycena: {zl(charged)}</span>
      </div>
    </div>
  );
}
