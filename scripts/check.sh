#!/usr/bin/env bash
# Full local gate. build-data outputs are committed; do not regenerate them here.
set -euo pipefail
cd "$(dirname "$0")/.."
npx prettier --check .
npx astro check
npx playwright test --config tests/unit/playwright.config.ts --project=unit
npx astro build
npx html-validate "dist/**/*.html"
npx playwright test --project=e2e
node scripts/check-budget.mjs
