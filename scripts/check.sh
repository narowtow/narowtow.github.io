#!/usr/bin/env bash
# Full local gate. Phase 0 minimum; pf-site extends it (format, unit, html-validate, e2e+axe, budget).
set -euo pipefail
cd "$(dirname "$0")/.."
npx astro check
npx astro build
