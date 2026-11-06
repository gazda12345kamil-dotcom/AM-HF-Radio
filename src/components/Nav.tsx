"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/wycena", label: "Sprawdź wycenę", short: "Wycena" },
  { href: "/auto", label: "Sprawdź auto", short: "Auto" },
  { href: "/historia", label: "Historia", short: "Historia" },
  { href: "/cennik", label: "Cennik", short: "Cennik" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="grid grid-cols-4 gap-1 text-sm sm:flex">
      {LINKS.map((l) => {
        const active = path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-lg px-2 py-2 text-center font-medium transition sm:px-3 ${
              active ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span className="sm:hidden">{l.short}</span>
            <span className="hidden sm:inline">{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
