# LIpsum Writer

[![Tests](https://github.com/DopaMindLabs/Writer/actions/workflows/e2e.yml/badge.svg?branch=main)](https://github.com/DopaMindLabs/Writer/actions/workflows/e2e.yml)
[![Latest release](https://img.shields.io/github/v/release/DopaMindLabs/Writer)](https://github.com/DopaMindLabs/Writer/releases/latest)
[![Dependabot](https://img.shields.io/badge/Dependabot-enabled-025E8C?logo=dependabot)](https://github.com/DopaMindLabs/Writer/network/updates)

> A clutter-free space for long-form writing — fiction, research, essays, journals.

A local-first, browser-based writing app built with React, Vite, and TypeScript. Data is stored in your browser's IndexedDB via Dexie; the editor is built on Lexical.

## Status

> ⚠️ **Experimental** — there is no data sync. All data is saved in IndexedDB in your local browser. If you clear your browser cache, your work will be lost.

## Requirements

- Node.js 20+
- npm (the project uses `package-lock.json`)
- A modern browser with IndexedDB support
- For e2e tests: Playwright browsers, installed via `npx playwright install`

## Run locally

```bash
npm install
npm run dev
```

The dev server starts at http://localhost:5173.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build locally
- `npm run typecheck` — TypeScript check only
- `npm run test` — run unit tests (Vitest, watch mode, `TZ=UTC`)
- `npm run test:run` — run unit tests once (CI mode)
- `npm run test:ui` — Vitest UI
- `npm run test:coverage` — unit test coverage
- `npm run test:e2e` — run Playwright e2e tests
- `npm run test:e2e:ui` — Playwright UI mode

## License

LIpsum Writer is source-available under the [PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/).
Free for personal, research, and non-profit use. For commercial licensing, contact the author.
