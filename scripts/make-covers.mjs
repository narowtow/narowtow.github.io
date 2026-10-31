import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Reuse the map geometry and bins, with the portfolio's light-theme colours.
// No fonts, timestamps or external resources: identical input produces identical PNGs.
const map = JSON.parse(
  await readFile(new URL("../src/data/hero-map.json", import.meta.url), "utf8"),
);
const paper = "#faf8f4";
const land = "#e9e5dc";
const neg = "#b5562f";
const zero = "#d9d4c7";
const pos = "#0e7c74";
const strong = "#064e4a";

// Match CSS colour-mix(in oklab, ...) rather than interpolating sRGB channels.
function toLab(hex) {
  const [r, g, b] = hex.match(/\w\w/g).map((v) => {
    const n = parseInt(v, 16) / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function mix(a, b, weight) {
  const first = toLab(a),
    second = toLab(b);
  const [L, A, B] = first.map((v, i) => v * (1 - weight) + second[i] * weight);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return `#${[
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
    .map((v) =>
      Math.round(
        255 *
          Math.max(
            0,
            Math.min(
              1,
              v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055,
            ),
          ),
      )
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
const colours = [
  neg,
  zero,
  mix(zero, pos, 0.35),
  mix(zero, pos, 0.7),
  pos,
  mix(pos, strong, 0.5),
  strong,
];
const dots = [...map.sites]
  .sort((a, b) => Number(a.ciLow <= 0) - Number(b.ciLow <= 0))
  .map((site) => {
    const bin = map.skillBins
      .slice(1, -1)
      .filter((n) => site.skill >= n).length;
    const colour = colours[bin];
    const uncertain = site.ciLow <= 0 && site.ciHigh >= 0;
    return `<circle cx="${site.x}" cy="${site.y}" r="4.2" fill="${uncertain ? "none" : colour}" stroke="${colour}" stroke-width="${uncertain ? 1.7 : 0.6}"/>`;
  })
  .join("");
// Fit the full map into a centred 1360 × 760 area, leaving generous paper margins.
const scale = Math.min(1360 / map.width, 760 / map.height);
const x = (1600 - map.width * scale) / 2;
const y = (1000 - map.height * scale) / 2;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000"><rect width="1600" height="1000" fill="${paper}"/><g transform="translate(${x} ${y}) scale(${scale})"><path d="${map.landPath}" fill="${land}"/>${dots}</g></svg>`;
await writeFile(
  new URL("../src/assets/projects/skillmap/cover-map.png", import.meta.url),
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer(),
);
