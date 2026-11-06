import { useView } from "./router";

export function usePathname(): string {
  return `/${useView()}`;
}
