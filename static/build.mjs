// Buduje jednoplikową wersję testową aplikacji: dist-static/index.html
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const shim = (f) => path.join(root, "static", f);

const js = await build({
  entryPoints: [shim("main.tsx")],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  logLevel: "warning",
  alias: {
    react: shim("shims/react.ts"),
    "react/jsx-runtime": shim("shims/jsx-runtime.ts"),
    "next/link": shim("shims/next-link.tsx"),
    "next/navigation": shim("shims/next-navigation.ts"),
    "@/lib/api": shim("api-local.ts"),
    "@": path.join(root, "src"),
  },
});

const cssSrc = path.join(root, "src/app/globals.css");
const css = await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(await readFile(cssSrc, "utf8"), {
  from: cssSrc,
});

const extraCss = `
:root{color-scheme:light}
body{background:#f8fafc;color:#0f172a}
.gutter{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.app-header{position:sticky;top:env(safe-area-inset-top,0px);z-index:20}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:30;background:#fff}
:focus-visible{outline:2px solid #059669;outline-offset:2px}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
`;

const html = `<title>Uczciwy Mechanik</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css.css}${extraCss}</style>
<div id="app"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>${js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script")}</script>
`;

await mkdir(path.join(root, "dist-static"), { recursive: true });
await writeFile(path.join(root, "dist-static/index.html"), html);
console.log(`dist-static/index.html: ${(html.length / 1024).toFixed(0)} KB`);
