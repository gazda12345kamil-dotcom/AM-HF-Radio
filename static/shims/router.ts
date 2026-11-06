import { useEffect, useState } from "react";

/** Nazwa widoku z adresu, np. "#wycena" -> "wycena"; pusty = strona startowa. */
export const currentView = () => window.location.hash.replace(/^#/, "");

export function useView(): string {
  const [view, setView] = useState(currentView());
  useEffect(() => {
    const on = () => setView(currentView());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return view;
}

/** Zamienia ścieżkę z aplikacji ("/wycena") na adres widoku ("#wycena"). */
export const toHash = (href: string) => `#${href.replace(/^\//, "")}`;
