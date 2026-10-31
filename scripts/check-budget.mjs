import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = resolve("dist");
const html = await readFile(resolve(root, "index.html"), "utf8");
const origin = "https://narowtow.github.io";
const css = new Set();
const js = new Set();
const getAttr = (tag, name) =>
  tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`))?.[1];
for (const tag of html.matchAll(/<link\b[^>]*>/g)) {
  const rel = getAttr(tag[0], "rel");
  const href = getAttr(tag[0], "href");
  if (href && rel === "stylesheet") css.add(href);
  if (href && rel === "modulepreload") js.add(href);
}
for (const tag of html.matchAll(/<script\b[^>]*>/g)) {
  const src = getAttr(tag[0], "src");
  if (src) js.add(src);
}
async function asset(path) {
  const url = new URL(path, origin);
  if (url.origin !== origin)
    throw new Error(`Unexpected runtime third-party resource: ${url}`);
  const file = resolve(root, `.${decodeURIComponent(url.pathname)}`);
  if (!file.startsWith(`${root}\\`) && !file.startsWith(`${root}/`))
    throw new Error("Asset outside dist");
  return readFile(file);
}
let cssGzip = 0;
for (const path of css) cssGzip += gzipSync(await asset(path)).length;
let externalJsGzip = 0;
// Include transitive static module imports in the initial JS budget.
for (const path of js) {
  const source = await asset(path);
  externalJsGzip += gzipSync(source).length;
  for (const match of source
    .toString()
    .matchAll(/(?:import|export)\s*(?:[^"';]*?\sfrom\s*)?["']([^"']+)["']/g)) {
    const url = new URL(match[1], new URL(path, origin));
    js.add(url.pathname);
  }
}
const inlineJs = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(
    ([, attrs]) =>
      !/type=["']application\/ld\+json/.test(attrs) && !/\bsrc=/.test(attrs),
  )
  .map(([, , source]) => source)
  .join("\n");
const jsGzip = externalJsGzip + (inlineJs ? gzipSync(inlineJs).length : 0);
const htmlGzip = gzipSync(html).length;
const total = htmlGzip + cssGzip + externalJsGzip;
const kb = (bytes) => `${(bytes / 1024).toFixed(2)} KB`;
console.log(
  "Home initial transfer (gzip; inline JS is already included in HTML)",
);
console.table([
  { Resource: "HTML", Gzip: kb(htmlGzip), Budget: "—" },
  { Resource: "CSS", Gzip: kb(cssGzip), Budget: "—" },
  { Resource: "JS (including inline)", Gzip: kb(jsGzip), Budget: "30 KB" },
  { Resource: "Total HTML + CSS + JS", Gzip: kb(total), Budget: "100 KB" },
]);
if (jsGzip > 30 * 1024 || total > 100 * 1024) process.exitCode = 1;
