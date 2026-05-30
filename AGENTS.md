# AGENTS.md

## Coding standards (read first)

This repo enforces a strict standard adapted from NASA/JPL's "Power of Ten". See
[CODING_STANDARDS.md](./CODING_STANDARDS.md). When writing or editing code:

- New or edited code must pass `npx eslint <files> --max-warnings=0` (the pre-commit hook
  enforces this on staged files). Existing warnings are a tracked backlog; do not add to it.
- Run `npm run lint` and `npm run typecheck` before committing; both gate CI.
- Use `invariant()` and `assertNever()` from `@/lib/invariant` to validate untrusted input.
- Write all functions as arrow functions (`const f = () => …`), including utilities.
- A test file's extension mirrors the file under test: `foo.ts` → `foo.test.ts`,
  `foo.tsx` → `foo.test.tsx`.
- `src/tours/` is exempt; `src/editor/` relaxes size limits only. For a one-off exception,
  add `// nasa-exception: <rule> (<reason>)` above an `// eslint-disable-next-line`.

## E2E test coverage (ratcheted)

E2E coverage is gated by a ratchet (`scripts/coverage-ratchet.mjs`, run via
`npm run test:e2e:coverage`) that compares the live run against the floors in
`coverage-baseline.json` and only ever raises them toward a 95% cap.

- **New user-facing features must land with ≥ 90% e2e coverage of their own code paths.**
  Add Playwright specs under `e2e/` alongside the feature; don't rely on unit tests to cover
  flows a user can click through.
- **Coverage may only increase.** Never lower a value in `coverage-baseline.json` or relax the
  ratchet to make CI pass — fix the tests instead. When a run raises the floors, commit the
  updated `coverage-baseline.json`.
- Run `npm run test:e2e:coverage` before committing coverage-affecting changes; it gates CI.
- `src/editor/**` and `src/tours/**` are excluded from e2e coverage (covered by unit tests); the
  90% bar applies to the rest of the app.

## Key commands

- `npm run dev`: Vite dev server
- `npm run lint` and `npm run lint:fix`: ESLint
- `npm run typecheck`: `tsc --noEmit`
- `npm run test:run`: unit tests (Vitest, once)
- `npm run test:e2e`: Playwright e2e
