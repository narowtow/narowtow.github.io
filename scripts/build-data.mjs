import { readFile, mkdir, writeFile } from "node:fs/promises";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";

// Source CSVs contain quoted descriptions (including commas). No network or timestamps.
function csv(text) {
  const rows = [];
  let row = [],
    value = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(value);
      value = "";
    } else if (c === "\n" && !quoted) {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else value += c;
  }
  if (value || row.length) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }
  const headers = rows.shift();
  return rows
    .filter((r) => r.length === headers.length)
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}
const read = (p) => readFile(new URL("../" + p, import.meta.url), "utf8");
const round = (n, digits = 4) => Number(Number(n).toFixed(digits));
const median = (ns) => {
  const a = [...ns].sort((a, b) => a - b);
  return (a[(a.length - 1) >> 1] + a[a.length >> 1]) / 2;
};
const [places, scores, topology, rankings] = await Promise.all([
  read("data/source/skillmap-sites.csv").then(csv),
  read("data/source/skillmap-skill-site-test.csv").then(csv),
  read("node_modules/world-atlas/land-110m.json").then(JSON.parse),
  read("data/source/visceral-age-rankings.json").then(JSON.parse),
]);
const selected = scores.filter(
  (r) =>
    r.model === "hgb" && r.reference === "best_baseline" && r.split === "test",
);
const rawMedian = median(selected.map((r) => +r.skill));
const nCiAboveZero = selected.filter((r) => +r.skill_ci_low > 0).length;
if (
  selected.length !== 200 ||
  Math.abs(rawMedian - 0.107) > 0.0005 ||
  nCiAboveZero !== 191
) {
  throw new Error(
    `Source mismatch: n=${selected.length}, median=${rawMedian}, CI above zero=${nCiAboveZero}`,
  );
}
const width = 960,
  padding = 14;
// Fit the full Equal Earth sphere, then reserve only its actual height plus padding.
// This avoids rectangular map whitespace without clipping any Antarctic stations.
const projection = geoEqualEarth().fitWidth(width - padding * 2, {
  type: "Sphere",
});
const path = geoPath(projection).digits(1);
const bounds = path.bounds({ type: "Sphere" });
projection.translate([
  projection.translate()[0] + padding,
  projection.translate()[1] - bounds[0][1] + padding,
]);
const height = Math.ceil(bounds[1][1] - bounds[0][1] + padding * 2);
const land = feature(topology, topology.objects.land);
// Drop subpixel vertices in projected space. Keep polygon endpoints and topology's shape.
let landPath = path(land);
landPath = landPath.replace(/([ML])([^MZ]+)/g, (_whole, command, coords) => {
  const pairs = coords.trim().split("L");
  let previous;
  const kept = [];
  pairs.forEach((pair, i) => {
    const [x, y] = pair.split(",").map(Number);
    if (
      !previous ||
      Math.hypot(x - previous[0], y - previous[1]) >= 1.2 ||
      i === pairs.length - 1
    ) {
      kept.push(pair);
      previous = [x, y];
    }
  });
  return command + kept.join("L");
});
if (Buffer.byteLength(landPath) >= 60000)
  throw new Error("Land outline exceeds 60 KB");
const byId = new Map(selected.map((r) => [r.site_id, r]));
// Longitude order supports west/east keyboard traversal; stable ID breaks ties.
const sites = [...places]
  .sort((a, b) => +a.lon - +b.lon || a.site_id.localeCompare(b.site_id))
  .map((p) => {
    const r = byId.get(p.site_id);
    if (!r) throw new Error(`Missing score: ${p.site_id}`);
    const [x, y] = projection([+p.lon, +p.lat]);
    return {
      id: p.site_id,
      name: p.name,
      country: p.country_code,
      koppen: p.koppen,
      group: p.koppen_group,
      desc: p.koppen_desc,
      x: round(x, 1),
      y: round(y, 1),
      skill: round(r.skill),
      ciLow: round(r.skill_ci_low),
      ciHigh: round(r.skill_ci_high),
      maeModel: round(r.mae_model, 2),
      maeRef: round(r.mae_ref, 2),
      reference: r.reference_model,
    };
  });
// Bounds are finite (null denotes the open end in JSON), exhaustive and shared with the UI/tests.
const skillBins = [null, 0, 0.04, 0.08, 0.12, 0.16, 0.2, null];
const errorBins = [null, 0.75, 1.25, 1.75, 2.25, 2.75, 3.25, null];
const groups = Object.entries({
  A: "tropical",
  B: "arid",
  C: "temperate",
  D: "continental",
  E: "polar",
}).map(([group, label]) => {
  const subset = sites.filter((s) => s.group === group);
  return {
    group,
    label,
    n: subset.length,
    medianSkill: round(median(subset.map((s) => s.skill))),
    nCiAboveZero: subset.filter((s) => s.ciLow > 0).length,
  };
});
const map = {
  width,
  height,
  landPath,
  sites,
  skillBins,
  errorBins,
  groups,
  summary: {
    n: sites.length,
    medianSkill: round(rawMedian),
    nCiAboveZero,
    period: "2024–2025 test years",
    model: "gradient boosting (per site)",
    comparator:
      "better of persistence and climatology, chosen on validation years",
  },
};
const row = rankings.data.find(
  (r) => r.location === "JPN" && r.organ === "heart" && r.measure === "deaths",
);
const nCountries = rankings.data.filter(
  (r) => r.organ === "heart" && r.measure === "deaths",
).length;
if (!row || row.rank_a !== 43 || row.rank_b !== 180 || nCountries !== 185)
  throw new Error("Japan ranking mismatch");
const facts = {
  source: "data/source/visceral-age-rankings.json",
  location: "JPN",
  organ: "heart",
  measure: "deaths",
  year: 2023,
  sex: "both sexes",
  unit: "deaths per 100,000",
  crudeRate: row.rate,
  ageStandardizedRate: row.ageStdRate,
  crudeRank: row.rank_a,
  ageStandardizedRank: row.rank_b,
  nCountries,
  rankOrder: "highest burden first",
};
await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../src/data/hero-map.json", import.meta.url),
  JSON.stringify(map) + "\n",
);
await writeFile(
  new URL("../src/data/visceral-facts.json", import.meta.url),
  JSON.stringify(facts, null, 2) + "\n",
);
console.log(
  `Hero: ${sites.length} sites; ${new Set(sites.map((s) => s.koppen)).size} classes; median ${rawMedian}; ${nCiAboveZero} CIs above zero; land ${Buffer.byteLength(landPath)} bytes.`,
);
console.log(
  "MAE extremes:",
  [...sites]
    .sort((a, b) => a.maeModel - b.maeModel)
    .filter((_, i) => i === 0 || i === sites.length - 1)
    .map((s) => `${s.name}: ${s.maeModel}`)
    .join("; "),
);
console.log("Japan:", facts);
