// CONTRACT (Phase 0). Projects:
//   unit -> tests/unit/**/*.spec.ts   (Node only, no browser; may import src/lib/* and src/data/*)
//   e2e  -> tests/e2e/**/*.spec.ts    (Chromium against the built site served by `astro preview`)
// Run after `astro build`: `npx playwright test --project=unit` / `--project=e2e`.
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORTFOLIO_TEST_PORT ?? 4321);

export default defineConfig({
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  projects: [
    { name: "unit", testDir: "tests/unit", testMatch: "**/*.spec.ts" },
    {
      name: "e2e",
      testDir: "tests/e2e",
      testMatch: "**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx astro preview --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    // Never reuse: a stray preview from another worktree would test a stale build.
    // If the port is busy, set PORTFOLIO_TEST_PORT.
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
