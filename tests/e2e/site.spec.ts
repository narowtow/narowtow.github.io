import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pages = [
  "/",
  "/projects/visceral/",
  "/projects/skillmap/",
  "/resume/",
  "/404.html",
];
const sizes = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const path of pages) {
  for (const viewport of sizes) {
    for (const colorScheme of ["light", "dark"] as const) {
      test(`${path} ${viewport.width}px ${colorScheme}: semantics, requests, reflow, axe`, async ({
        page,
        baseURL,
      }) => {
        await page.setViewportSize(viewport);
        await page.emulateMedia({ colorScheme });
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("request", (request) => {
          if (new URL(request.url()).origin !== baseURL)
            errors.push(`Third-party runtime request: ${request.url()}`);
        });
        page.on("console", (message) => {
          if (message.type() === "error") errors.push(message.text());
        });
        page.on("requestfailed", (request) => {
          if (request.url().startsWith(baseURL!))
            errors.push(`Failed: ${request.url()}`);
        });
        page.on("response", (response) => {
          if (response.url().startsWith(baseURL!) && response.status() >= 400)
            errors.push(`${response.status()}: ${response.url()}`);
        });
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("main")).toHaveCount(1);
        await expect(page.locator("iframe")).toHaveCount(0);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect(
          (await new AxeBuilder({ page }).withTags(tags).analyze()).violations,
        ).toEqual([]);
        expect(errors).toEqual([]);
        if (path === "/" && viewport.width === 1440) {
          expect(
            (await page.locator("#projects-title").boundingBox())!.y,
          ).toBeLessThan(900);
        }
      });
    }
  }
}

test("theme choice persists, System clears it, and storage is optional", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Dark", exact: true }),
  ).toBeChecked();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await page.getByRole("radio", { name: "Light", exact: true }).check();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("radio", { name: "System", exact: true }).check();
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await page.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"]) {
      Object.defineProperty(Storage.prototype, method, {
        value: () => {
          throw new Error("Storage unavailable");
        },
      });
    }
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.reload();
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("radio", { name: "System", exact: true }).check();
  expect(errors).toEqual([]);
});

test("reduced motion removes transitions and animated movement", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page.evaluate(() =>
      [...document.querySelectorAll("*")]
        .filter((element) => {
          const style = getComputedStyle(element);
          return (
            style.animationName !== "none" ||
            style.transitionDuration
              .split(",")
              .some((time) => parseFloat(time) > 0)
          );
        })
        .map((element) => element.tagName),
    ),
  ).toEqual([]);
});

test("without JavaScript the home is readable with contact and system theme", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    colorScheme: "dark",
    viewport: sizes[0],
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Justin Ho", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "I analyze real-world data and build interactive tools to explore it.",
    ),
  ).toBeVisible();
  await expect(page.locator(".project-card")).toHaveCount(2);
  await expect(page.locator("#contact")).toContainText(
    "justindkho [at] gmail [dot] com",
  );
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await expect(page.locator("[data-theme-control]")).toBeHidden();
  await context.close();
});

test("every internal link and fragment resolves", async ({
  page,
  request,
  baseURL,
}) => {
  const visited = new Set<string>();
  for (const path of pages) {
    await page.goto(path);
    const links = await page
      .locator("a[href]")
      .evaluateAll((anchors) =>
        anchors.map((anchor) => (anchor as HTMLAnchorElement).href),
      );
    for (const href of links) {
      const url = new URL(href);
      // The separately deployed app and owner-supplied PDF are outside this build.
      if (
        url.origin !== baseURL ||
        url.pathname === "/visceral/" ||
        url.pathname === "/resume.pdf" ||
        visited.has(href)
      )
        continue;
      visited.add(href);
      const response = await request.get(url.pathname);
      expect(response.status(), href).toBe(200);
      if (url.hash) {
        const id = decodeURIComponent(url.hash.slice(1));
        const body = await response.text();
        expect(body, href).toContain(`id="${id}"`);
      }
    }
  }
});

test("skip link focuses main and keyboard reaches every navigation link", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page.getByRole("link", { name: "Skip to content" }).focus();
  const reached = new Set<string>();
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press("Tab");
    const text = await page.evaluate(() =>
      document.activeElement?.closest("header nav")
        ? document.activeElement.textContent?.trim()
        : null,
    );
    if (text) reached.add(text);
  }
  expect([...reached].sort()).toEqual([
    "About",
    "Contact",
    "Projects",
    "Résumé",
  ]);
});

test("email enhancement supports mail and copy confirmation", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const contact = page.locator("#contact");
  const link = contact.locator("[data-email-link]");
  await expect(link).toHaveAttribute("href", "mailto:justindkho@gmail.com");
  await contact.getByRole("button", { name: "Copy email" }).click();
  await expect(contact.getByRole("status")).toHaveText("Email copied.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "justindkho@gmail.com",
  );
});

test("demo is click-to-load and has an accessible reserved frame", async ({
  page,
}) => {
  let demoRequests = 0;
  await page.route("https://narowtow.github.io/visceral/**", async (route) => {
    demoRequests++;
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html lang='en'><title>Demo fixture</title><body>Demo fixture</body></html>",
    });
  });
  await page.goto("/projects/visceral/");
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(demoRequests).toBe(0);
  const before = await page.locator(".demo-frame").boundingBox();
  await page.getByRole("button", { name: "Load interactive demo" }).click();
  await expect(page.locator("iframe")).toHaveAttribute(
    "title",
    "Visceral interactive demo",
  );
  await expect.poll(() => demoRequests).toBe(1);
  const after = await page.locator(".demo-frame").boundingBox();
  expect(after?.height).toBe(before?.height);
});

test("résumé download link exists and every page reflows at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const path of pages) {
    await page.goto(path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      path,
    ).toBe(true);
  }
  await page.goto("/resume/");
  await expect(
    page.getByRole("link", { name: "Download PDF" }),
  ).toHaveAttribute("href", "/resume.pdf");
  await expect(
    page.getByRole("link", { name: "Download PDF" }),
  ).toHaveAttribute("download", "");
});
