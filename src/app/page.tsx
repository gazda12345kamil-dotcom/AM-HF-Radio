import Link from "next/link";

const STEPS = [
  { icon: "📷", title: "Zrób zdjęcie wyceny", text: "Kosztorys, wycena albo faktura z warsztatu. Możesz też wpisać pozycje ręcznie." },
  { icon: "⚖️", title: "Porównamy ceny", text: "Każdą pozycję zestawiamy z typowymi cenami części i robocizny w Polsce." },
  { icon: "💬", title: "Wiesz, co robić", text: "Prosty opis naprawy, czy jest pilna, i lista pytań do mechanika." },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-800 px-6 py-10 text-white shadow-lg">
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">Nie przepłacaj u mechanika.</h1>
        <p className="mt-3 max-w-xl text-lg text-emerald-50">
          Zrób zdjęcie wyceny z warsztatu i w kilkanaście sekund sprawdź, czy cena jest uczciwa.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/wycena" className="btn-primary !bg-white !text-brand-800 hover:!bg-emerald-50">
            📷 Sprawdź wycenę
          </Link>
          <Link href="/auto" className="btn-ghost !border-white/40 !bg-transparent !text-white hover:!bg-white/10">
            🔎 Sprawdź auto po VIN
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="card">
            <p className="text-3xl">{s.icon}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Krok {i + 1}</p>
            <h2 className="font-bold">{s.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{s.text}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">Kupujesz używane auto?</h2>
        <p className="mt-1 text-slate-600">
          Wpisz numer VIN: sprawdzimy, czy jest poprawny, kto wyprodukował auto i z którego jest rocznika, a potem
          pokażemy, gdzie za darmo sprawdzić przebieg i historię w oficjalnych bazach.
        </p>
        <Link href="/auto" className="btn-ghost mt-4">Sprawdź auto</Link>
      </section>
    </div>
  );
}
