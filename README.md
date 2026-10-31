# Justin Ho’s portfolio

A static portfolio for a De Anza College Computer Science student, presenting reproducible projects in public health and climate.

Built with Astro, TypeScript, Markdown collections, plain CSS, and self-hosted Source Serif 4, Inter, and JetBrains Mono. Pages work without JavaScript; theme selection, email copy, and optional demos progressively enhance them.

## Local development

Use the Node version in `.node-version`.

```sh
npm ci
npm run dev
bash scripts/check.sh
```

Dependencies and Playwright Chromium are preinstalled in the worker environment. Do not install or fetch packages there. The check runs formatting, Astro diagnostics, schema/data unit tests, a static build, HTML validation, browser/accessibility tests, and gzip budgets. Unit tests use a small configuration extending the shared contract without starting a preview server before the build. `npm run audit` separately runs three mobile Lighthouse audits per page with Playwright’s Chromium. Reports stay uncommitted.

## Add a project

Add one Markdown file in `src/content/projects/` and a cover image in `src/assets/projects/`. Follow the fields in `src/lib/project-schema.ts`; metric details must explain the metric, comparator, population, and period. Put an image on its own line followed by an italic paragraph for a figure caption. Projects, case-study routes, and résumé entries come from the collection. `draft: true` hides a project through `getProjects()`.

Data outputs are committed; `npm run build:data` regenerates them when source data changes. The quality gate does not regenerate data. `node scripts/make-og.mjs` regenerates the committed social card.

## Deployment

GitHub Actions validates pushes and pull requests. The deployment workflow publishes `dist/` to GitHub Pages on pushes to `main` or manual dispatch. Enable GitHub Actions as the Pages source. The canonical site is `https://narowtow.github.io/`; `/visceral/` remains a separate app and is never generated here. The owner supplies `public/resume.pdf`; the HTML résumé already links to it. The sitemap integration automatically omits Astro’s 404 route.

HTML validation retains the recommended rules. `void-style` matches Astro’s emitted HTML; inline styles are allowed for Astro image sizing and the pre-paint theme script; long page titles are allowed to retain the project name and subtitle. No accessibility rules are disabled.
