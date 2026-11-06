// Odpowiednik react/jsx-runtime oparty na globalnym window.React (z CDN).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const R = (window as any).React;
export const Fragment = R.Fragment;

type Props = Record<string, unknown> & { children?: unknown };

export function jsx(type: unknown, props: Props, key?: unknown) {
  return R.createElement(type, key === undefined ? props : { ...props, key });
}

/** Statyczne dzieci (z kodu, nie z .map) – przekazujemy osobno, żeby React nie wymagał kluczy. */
export function jsxs(type: unknown, props: Props, key?: unknown) {
  const { children, ...rest } = props;
  if (key !== undefined) rest.key = key;
  return Array.isArray(children) ? R.createElement(type, rest, ...children) : R.createElement(type, rest, children);
}
