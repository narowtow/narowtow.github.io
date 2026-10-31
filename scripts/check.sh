#!/usr/bin/env bash
# Full local gate. build-data outputs are committed; do not regenerate them here.
set -euo pipefail
cd "$(dirname "$0")/.."
npx prettier --check .
npx astro check
npx playwright test --config tests/unit/playwright.config.ts --project=unit
npx astro build
npx html-validate "dist/**/*.html"
# Serve e2e on a free port: parallel worktrees (and orphaned previews) can hold 4321.
if [ -z "${PORTFOLIO_TEST_PORT:-}" ]; then
  PORTFOLIO_TEST_PORT=$(node -e "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})")
  export PORTFOLIO_TEST_PORT
fi
npx playwright test --project=e2e
node scripts/check-budget.mjs
