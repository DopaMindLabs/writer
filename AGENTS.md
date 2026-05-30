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

## Testing philosophy (read before changing tests)

Unit tests (Vitest) and e2e tests (Playwright) exist to **prevent regressions** — to
protect existing, working behavior from unintended change. Treat them as a safety net,
not a checkbox.

- **Take a TDD/BDD approach.** Before implementing a change, write or extend a test that
  describes the intended behavior, then make it pass. New behavior ships with a test that
  would fail without it.
- **A green run is not the objective.** Stability and the absence of unintended changes
  are. Passing tests are a means of confirming that, not the goal itself.
- **When a test fails, find the root cause and fix the regression.** Do not delete, skip,
  `.only`/`.skip`, weaken assertions, or rewrite a test just to make it pass. A failing
  test is signalling that behavior changed — diagnose why.
- The **only** exception is when the user has explicitly agreed that the feature under
  test is being removed or is redundant. In that case, remove the test as part of that
  agreed change.
- Run `npm run test:run` (and `npm run test:e2e` for UI-facing changes) before committing,
  alongside `npm run lint` and `npm run typecheck`.

## Key commands

- `npm run dev`: Vite dev server
- `npm run lint` and `npm run lint:fix`: ESLint
- `npm run typecheck`: `tsc --noEmit`
- `npm run test:run`: unit tests (Vitest, once)
- `npm run test:e2e`: Playwright e2e
