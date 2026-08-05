---
name: test-writer-changes
description: >
  TDD workflow, test rules, and targeted commands for Writer. Use when writing,
  fixing, or auditing tests. Trigger terms: "test", "TDD", "vitest", "playwright",
  "e2e", "coverage", "spec", "failing test", "skip test".
metadata:
  version: "1.2.0"
  tags: "testing,tdd,vitest,playwright,coverage"
---

# Test Writer Changes

## TDD workflow

1. **Write the failing test first.** Describe the intended behaviour; run it to confirm
   it fails for the right reason.
2. **Implement to make it pass.** Keep implementation minimal.
3. **Refactor under green.** Never skip this step.

## Absolute rules (no exceptions)

- **Never skip, focus, delete, or weaken a test.** No `.skip`, `.only`, `xit`,
  `xdescribe`, `test.fixme`, or commenting-out a test to get a green run.
- **Never lower a coverage floor** in `coverage-baseline.json`. Raise floors when the
  run improves them; never lower to make CI pass.
- **A failing test signals a regression.** Diagnose and fix the root cause.
- The only removal exception: the user explicitly agrees the feature under test is
  being removed. Ask first; never decide unilaterally.

## Unit tests (Vitest)

- Test files mirror the source: `foo.ts` → `foo.test.ts`, `foo.tsx` → `foo.test.tsx`.
- Assert the **public API only** — no access to private methods via `(service as any)._x`.
- Use `it.each` for input → output mappings.
- No `any` in tests, including `: any`, `as any`, `<any>`, `Partial<any>`.
- No `console.warn` / `console.error` output from tests — resolve the root cause.
- Run: `npm run test:run` (once) or `npm run test` (watch mode — won't exit).

## E2E tests (Playwright)

- Specs live in `e2e/*.spec.ts`; reuse helpers from `e2e/_helpers.ts`.
- **Always headless** — never `--headed` or `--ui` in an agent or CI context.
- **Cross-platform** — use `ControlOrMeta+A` (not `Meta+A`) for keyboard shortcuts.
  `Meta+A` is no-op on Linux (CI), which silently voids assertions.
- No `page.waitForTimeout()` or hardcoded `setTimeout` — use Playwright's auto-waiting.
- No `{ force: true }` on `.click()` — fix the locator or wait condition instead.
- Use `getByRole`, `getByText`, `getByTestId`, `data-testid` for stable selectors.
- Run: `npm run test:e2e`
- Coverage ratchet: `npm run test:e2e:coverage`

## Cross-cutting verification

### Accessibility

For any user-facing or interaction-affecting change, derive tests from
`ACCESSIBILITY.md`, including settings and functionality that change how a person
perceives, operates, understands or recovers from the product. Cover keyboard/focus,
status and errors, preference persistence, timing or gesture alternatives when they
apply. Automated axe/Storybook checks are supporting evidence only; WCAG 2.2 AAA
still requires manual review of every applicable A, AA and AAA criterion.

### Security

For a security-sensitive or trust-boundary change, add negative/adversarial tests for
the invariant being protected. Derive them from the feature threat model and the
applicable OWASP Top 10 risk in `audit-writer-change`; include malformed input and
exceptional/failure paths where relevant. A happy-path test does not clear a security
boundary.

## Coverage targets

- Global and per-feature: **≥ 95%** across new and changed code paths.
- **85% is the hard floor** — if 95% is genuinely unreachable (browser APIs, unsimulatable
  failures), stop and report back to the user before proceeding. State which files fall
  short, the exact percentages, and why.
- `src/editor/**` and `src/tours/**` are excluded from e2e coverage (covered by unit tests).

## Targeted test commands

Run the narrowest possible subset to get fast feedback:

```bash
# Single unit test file
npx vitest run src/lib/docs/docRepository.test.ts

# Single e2e spec
npx playwright test e2e/<spec>.spec.ts

# All unit tests (once)
npm run test:run

# Type-check only
npm run typecheck

# Lint a specific file
npx eslint src/lib/docs/docRepository.ts --max-warnings=0
```

## Playwright browser install

If the browser is missing: `npx playwright install chromium`.

## Track this work as a todo list

Before you start, seed a todo list from the TDD workflow above — one item for the failing
test, one to implement, one to refactor under green — and add one item per behaviour or
coverage gap you still owe a test (see [AGENTS.md § "Todo tracking"](../../../AGENTS.md)).
Mark exactly one item in-progress as you begin it and completed the moment it is verified
done. A red or skipped test keeps its item open — never mark it done to get to green. Keep
the list current: it is the source of truth for what remains and the backbone of any
[handover](../handover-writer-work/SKILL.md).
