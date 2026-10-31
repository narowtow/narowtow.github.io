import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";

const font = async (family) =>
  (
    await readFile(
      `node_modules/@fontsource-variable/${family}/files/${family}-latin-wght-normal.woff2`,
    )
  ).toString("base64");
const serif = await font("source-serif-4");
const mono = await font("jetbrains-mono");
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Justin Ho social card</title><style>
    @font-face{font-family:Serif;src:url(data:font/woff2;base64,${serif}) format('woff2');font-weight:200 900}
    @font-face{font-family:Mono;src:url(data:font/woff2;base64,${mono}) format('woff2');font-weight:100 800}
    *{box-sizing:border-box}body{margin:0;background:#faf8f4;color:#1c1b19;padding:58px 72px;height:630px;border-left:12px solid #0e6e6b}
    header{font:15px Mono;letter-spacing:2px;text-transform:uppercase;padding-bottom:24px;border-bottom:1px solid #dedad2;color:#5c5a55}
    h1{font:450 122px/1 Serif;letter-spacing:-6px;margin:44px 0 22px}p{font:400 37px/1.3 Serif;max-width:820px;margin:0}
    footer{position:absolute;bottom:48px;left:84px;right:72px;padding-top:20px;border-top:1px solid #dedad2;display:flex;justify-content:space-between;font:14px Mono;color:#0e6e6b}
    </style><header>Computer Science · De Anza College</header><h1>Justin Ho</h1><p>I analyze real-world data and build interactive tools to explore it.</p><footer><span>Selected work</span><span>narowtow.github.io ↗</span></footer></html>`);
  await page.evaluate(() => document.fonts.ready);
  await mkdir("public/og", { recursive: true });
  await page.screenshot({ path: "public/og/default.png" });
  console.log("Created public/og/default.png (1200 × 630)");
} finally {
  await browser.close();
}
