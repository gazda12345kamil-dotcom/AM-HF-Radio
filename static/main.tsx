import { useEffect } from "react";
import Home from "@/app/page";
import WycenaPage from "@/app/wycena/page";
import AutoPage from "@/app/auto/page";
import HistoriaPage from "@/app/historia/page";
import CennikPage from "@/app/cennik/page";
import { Nav } from "@/components/Nav";
import { useView } from "./shims/router";

const VIEWS: Record<string, () => React.ReactNode> = {
  wycena: WycenaPage,
  auto: AutoPage,
  historia: HistoriaPage,
  cennik: CennikPage,
};

const LOGO =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#059669"/><path d="M32 12l16 6v11c0 11-7 19-16 23-9-4-16-12-16-23V18z" fill="#fff"/><path d="M25 32l5 5 10-11" stroke="#059669" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  );

function App() {
  const view = useView();
  const Page = VIEWS[view] ?? Home;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);
  return (
    <>
      <header className="app-header border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="gutter mx-auto flex max-w-3xl flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
          <a href="#" className="flex items-center gap-2 text-lg font-bold text-ink">
            <img src={LOGO} alt="" width={28} height={28} />
            Uczciwy Mechanik
          </a>
          <Nav />
        </div>
      </header>
      <div className="gutter mx-auto max-w-3xl pt-4">
        <p className="rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900">
          Wersja testowa: działa w całości w przeglądarce. Odczyt zdjęć jest w trybie demo, a dane zapisują się tylko na tym
          urządzeniu.
        </p>
      </div>
      <main className="gutter mx-auto max-w-3xl py-6">
        <Page key={view} />
      </main>
      <footer className="gutter mx-auto max-w-3xl pb-10 pt-4 text-xs leading-relaxed text-slate-500">
        Oceny cen są szacunkami na podstawie typowych cen części i robocizny w Polsce. Nie zastępują opinii mechanika ani
        porady prawnej.
      </footer>
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactDOM = (window as any).ReactDOM;
ReactDOM.createRoot(document.getElementById("app")).render(<App />);
