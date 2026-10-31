import { test, expect } from "@playwright/test";
import map from "../../src/data/hero-map.json" with { type: "json" };
import facts from "../../src/data/visceral-facts.json" with { type: "json" };

test("hero data preserves the verified source population and results", () => {
  expect(map.sites).toHaveLength(200);
  expect(new Set(map.sites.map((s) => s.id)).size).toBe(200);
  for (const site of map.sites) {
    for (const key of [
      "x",
      "y",
      "skill",
      "ciLow",
      "ciHigh",
      "maeModel",
      "maeRef",
    ] as const) {
      expect(typeof site[key]).toBe("number");
      expect(Number.isFinite(site[key])).toBe(true);
    }
    expect(site.x).toBeGreaterThanOrEqual(0);
    expect(site.x).toBeLessThanOrEqual(map.width);
    expect(site.y).toBeGreaterThanOrEqual(0);
    expect(site.y).toBeLessThanOrEqual(map.height);
    expect(site.ciLow).toBeLessThanOrEqual(site.skill);
    expect(site.ciHigh).toBeGreaterThanOrEqual(site.skill);
  }
  const skills = map.sites.map((s) => s.skill).sort((a, b) => a - b);
  expect(Number(((skills[99] + skills[100]) / 2).toFixed(3))).toBe(0.107);
  expect(map.sites.filter((s) => s.ciLow > 0)).toHaveLength(191);
  expect(map.groups.reduce((n, g) => n + g.n, 0)).toBe(200);
  expect(map.groups.reduce((n, g) => n + g.nCiAboveZero, 0)).toBe(191);
  expect(new Set(map.sites.map((s) => s.koppen)).size).toBe(29);
});

test("legend bins exhaustively cover the source ranges", () => {
  for (const [field, bins] of [
    ["skill", map.skillBins],
    ["maeModel", map.errorBins],
  ] as const) {
    expect(bins[0]).toBeNull();
    expect(bins.at(-1)).toBeNull();
    const interior = bins.slice(1, -1) as number[];
    expect(interior).toEqual([...interior].sort((a, b) => a - b));
    const counts = new Array(7).fill(0);
    for (const site of map.sites) {
      const bin = interior.filter((n) => site[field] >= n).length;
      expect(bin).toBeGreaterThanOrEqual(0);
      expect(bin).toBeLessThan(7);
      counts[bin]++;
    }
    expect(counts[0]).toBeGreaterThan(0);
    expect(counts[6]).toBeGreaterThan(0);
  }
  expect(Buffer.byteLength(map.landPath)).toBeLessThan(60000);
});

test("Japan compares the same population and year under two rate methods", () => {
  expect(facts).toMatchObject({
    location: "JPN",
    measure: "deaths",
    organ: "heart",
    sex: "both sexes",
    year: 2023,
    nCountries: 185,
    crudeRate: 189.9,
    ageStandardizedRate: 81.99,
    crudeRank: 43,
    ageStandardizedRank: 180,
  });
});
