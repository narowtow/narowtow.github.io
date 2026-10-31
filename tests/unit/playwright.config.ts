// The shared config starts astro preview, which needs dist. Unit tests run before
// the build in check.sh, so retain its unit project without its browser server.
import { defineConfig } from "@playwright/test";
import shared from "../../playwright.config";
export default defineConfig({
  ...shared,
  webServer: undefined,
  projects: [{ name: "unit", testDir: ".", testMatch: "**/*.spec.ts" }],
});
