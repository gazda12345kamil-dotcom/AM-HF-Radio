import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uczciwy Mechanik",
  description: "Zrób zdjęcie wyceny z warsztatu i sprawdź, czy cena jest uczciwa. Sprawdź auto po numerze VIN.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#059669", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="min-h-screen font-sans antialiased">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-ink">
              <img src="/icon.svg" alt="" width={28} height={28} />
              Uczciwy Mechanik
            </Link>
            <Nav />
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 pb-10 pt-4 text-xs leading-relaxed text-slate-500">
          Oceny cen są szacunkami na podstawie typowych cen części i robocizny w Polsce. Nie zastępują opinii
          mechanika ani porady prawnej.
        </footer>
      </body>
    </html>
  );
}
