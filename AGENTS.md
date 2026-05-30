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

## Design system (read before building UI)

[`docs/design-system.md`](./docs/design-system.md) is the **single source of truth** for
design tokens, principles, and UI primitives, adapted from the canonical "Lorem Ipsum — Design
System" design spec. When adding or changing any component or feature, verify it aligns:

- **Verify alignment.** Use the design tokens (the token-backed Tailwind classes
  `ink`/`paper`/`rule`/`accent`/`hl-*`/`warning`/`danger`/`success`/`info` from
  `tailwind.config.ts`, backed by `src/index.css`) and follow the principles: hairline grammar,
  grayscale palette with status as the only colour exception, three type families (Geist /
  Source Serif 4 / Geist Mono), square corners, borderless icons. **Never hard-code a hex or
  px colour** — there is a token for it.
- **Compose, don't reinvent.** Build from the existing primitives in `src/components/ui/`
  (Button, TextField, Select, Checkbox, RadioRow, FormRow, Fieldset, Chip/ChipGroup, dialog,
  popover, tooltip, tabs, …). Style variants with `cva` (`@/components/libs/variants`) + `cn`
  (`@/lib/utils`); use Radix wrappers from `@/components/libs/primitives` and icons from
  `@/components/libs/icons`. Don't duplicate a primitive or reach for a raw `lucide-react`
  import.
- **Raise gaps, don't work around them.** If no suitable primitive or token exists, **do not**
  hard-code a one-off. Give feedback that the design system must be extended — add the
  primitive under `src/components/ui/` and update `docs/design-system.md` to match — so the DS
  stays the source of truth and the gap is addressed, not buried.
- **HOCs must be composed from and consistent with the DS** — its primitives and tokens, not
  bespoke markup or colours.
- **Scope.** Reading-and-publishing surfaces are out of scope for this repo and are omitted
  from `docs/design-system.md`; build the **writer** surface only.
- Add a `.test.tsx` and a `.stories.tsx` mirroring the file under test (see
  [CODING_STANDARDS.md](./CODING_STANDARDS.md)).
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
