import { test, expect } from "@playwright/test";
import map from "../../src/data/hero-map.json" with { type: "json" };

test("all sites and the compact summary are readable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const chart = page.locator("[data-hero-chart]");
  await expect(chart.locator("circle[data-site]")).toHaveCount(200);
  await expect(chart.locator("figcaption")).toContainText("191 of 200");
  await chart.locator("summary").click();
  await expect(chart.locator("tbody tr")).toHaveCount(5);
  await context.close();
});

test("toggle, keyboard and pointer inspection work without console errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  const chart = page.locator("[data-hero-chart]");
  const error = chart.getByRole("button", { name: "Error (°C)", exact: true });
  await error.click();
  await expect(error).toHaveAttribute("aria-pressed", "true");
  await expect(chart.locator("[data-legend-title]")).toHaveText(
    "Model mean absolute error (°C)",
  );
  await expect(chart.locator("figcaption")).toContainText("Port Blair");
  await chart.getByRole("button", { name: "Skill", exact: true }).click();
  await expect(error).toHaveAttribute("aria-pressed", "false");
  await expect(chart.locator("[data-legend-title]")).toHaveText(
    "Skill vs better baseline",
  );
  // The second control immediately precedes the plot in tab order.
  await error.focus();
  await page.keyboard.press("Tab");
  const plot = chart.locator("svg");
  await expect(plot).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(chart.locator("[data-readout]")).toContainText(
    map.sites[0].name,
  );
  await page.keyboard.press("ArrowRight");
  await expect(chart.locator("[data-readout]")).toContainText(
    map.sites[1].name,
  );
  await page.keyboard.press("ArrowDown");
  await expect(chart.locator("[data-readout]")).toContainText("Model MAE");
  await page.keyboard.press("Escape");
  await expect(chart.locator("[data-readout]")).toContainText("Explore a site");
  const mark = chart.locator('[data-site="0"]');
  const box = await mark.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(chart.locator("[data-readout]")).toContainText(
    map.sites[0].name,
  );
  expect(errors).toEqual([]);
});

test("a touch tap keeps the selected site readable after the finger leaves", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 1000 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  const chart = page.locator("[data-hero-chart]");
  const mark = chart.locator('[data-site="0"]');
  const box = await mark.boundingBox();
  await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(chart.locator("[data-readout]")).toContainText(
    map.sites[0].name,
  );
  await expect(chart.locator('[data-current="true"]')).toHaveCount(1);
  expect(box!.width).toBeGreaterThanOrEqual(6.98);
  await context.close();
});
