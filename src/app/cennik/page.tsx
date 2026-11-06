"use client";

import { useEffect, useState } from "react";
import { PLANS, formatPrice } from "@/lib/plans";
import { currentPlan, usageThisMonth } from "@/lib/storage";

export default function CennikPage() {
  const [planId, setPlanId] = useState<string | null>(null);
  const [used, setUsed] = useState(0);

  useEffect(() => {
    setPlanId(currentPlan().id);
    setUsed(usageThisMonth());
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Cennik</h1>
        <p className="mt-1 text-slate-600">
          Ręczne sprawdzanie wycen i sprawdzanie auta po VIN są zawsze za darmo. Plany różnią się liczbą zdjęć wycen, które
          odczytuje AI.
        </p>
        {planId && (
          <p className="mt-2 text-sm text-slate-600">
            Wykorzystane w tym miesiącu: <strong>{used}</strong> z {PLANS.find((p) => p.id === planId)?.photoChecks}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((p) => {
          const current = p.id === planId;
          return (
            <section key={p.id} className={`card flex flex-col ${p.highlight ? "ring-2 ring-brand-600" : ""}`}>
              {p.highlight && <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-700">Najczęściej wybierany</p>}
              <h2 className="text-lg font-bold">{p.name}</h2>
              <p className="text-sm text-slate-500">{p.forWhom}</p>
              <p className="mt-3 text-3xl font-bold">
                {formatPrice(p.priceMonthly)}
                {p.priceMonthly > 0 && <span className="text-base font-medium text-slate-500"> / mies.</span>}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-brand-600">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button type="button" disabled className={`mt-5 w-full ${current ? "btn-ghost" : "btn-primary"}`}>
                {current ? "Twój obecny plan" : "Płatności wkrótce"}
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
