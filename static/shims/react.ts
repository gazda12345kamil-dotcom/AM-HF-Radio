// React jest ładowany jako skrypt z CDN (zmienna globalna window.React).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const R = (window as any).React;
export default R;
export const { useState, useEffect, useRef, useMemo, useCallback, Fragment, createElement } = R;
