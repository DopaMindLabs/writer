# Agent Policies

> This file consolidates the detailed policy substance from `AGENTS.md` for use as a
> progressive-disclosure reference by skills. It does **not** replace `AGENTS.md` — that
> file remains the first thing an agent reads. Treat any conflict as a bug; fix both.

---

## 1. Coding standards

Source of truth: [`CODING_STANDARDS.md`](../CODING_STANDARDS.md).

All new and edited code must pass `npx eslint <files> --max-warnings=0`. The pre-commit
hook enforces this on staged files. Run `npm run lint` and `npm run typecheck` before
committing; both gate CI.

### The ten rules (NASA/JPL Power-of-Ten adapted)

1. **Simple control flow.** Cyclomatic complexity ≤ 12; nesting ≤ 4; no unbounded
   recursion.
2. **Bounded loops.** Every loop has an obvious upper bound; no `while (true)` without a
   guaranteed exit.
3. **No unbounded growth or leaks.** Clean up effects, listeners, timers, subscriptions,
   and queries in every React component and hook.
4. **Small functions.** ≤ 60 lines, ≤ 3 parameters (use an options object beyond three).
5. **Assert at boundaries.** Use `invariant()` and `assertNever()` from
   `@/lib/invariant` to validate untrusted input; fail closed.
6. **Smallest data scope.** `const` by default; no module-level mutable state; narrowest
   types.
7. **Check every return value.** No floating promises; handle every nullable return; do
   not swallow errors.
8. **No type escape hatches.** No `any`, `@ts-ignore`, `@ts-expect-error`, lint
   suppression, or equivalent escape hatch. Fix the type or structure instead.
9. **Immutability.** `readonly` on interfaces; do not mutate parameters or shared state;
   use immutable Zustand update patterns.
10. **Zero lint/type errors in CI.** Never raise or loosen size limits, disable ESLint
    rules, or add suppressions. Fix the code instead.

### Style

- All functions are arrow functions (`const f = () => …`), including utilities.
- One component per file (PascalCase filename). One service per file.
- Types in a dedicated `*.types.ts` file, or co-located with the module they describe.
- Test files mirror their source: `foo.ts` → `foo.test.ts`, `foo.tsx` → `foo.test.tsx`.

### Non-negotiable constraints

- **Do not relax limits or silence the linter.** If a limit genuinely cannot be met,
  stop and ask the user — do not decide unilaterally.
- **Refactor non-compliant files in a separate commit first** before applying a
  behavioural change. Keep refactor and feature in distinct commits.
- **Legacy support requires explicit permission.** Do not extend or add legacy code paths
  without an explicit yes from the user.

---

## 2. British English

All user-facing copy, documentation, comments, and UI strings use **British English**:
`-ise`/`-isation`, `-our`, `-re`, and `-ce` for nouns.

**Exceptions (do not rename):** code identifiers, URL slugs, CSS/token names, and
established proper names already used in the codebase.

---

## 3. Design system

Source of truth: [`docs/design-system.md`](./design-system.md).

- Use the design tokens (`ink`/`paper`/`rule`/`accent`/`hl-*`/`warning`/`danger`/
  `success`/`info`) from `tailwind.config.ts`, backed by `src/index.css`. **Never
  hard-code a hex or `px` colour.**
- Read the full component catalogue before choosing a primitive. Pick the primitive whose
  **documented use** matches the intent; do not copy what neighbouring code happens to use.
- Compose from `src/components/ui/` (Button, TextField, Select, Checkbox, RadioRow,
  FormRow, Fieldset, Chip/ChipGroup, dialog, popover, tooltip, tabs, …).
- Style variants with `cva` (`@/components/libs/variants`) + `cn` (`@/lib/utils`).
- Use Radix wrappers from `@/components/libs/primitives`; icons from
  `@/components/libs/icons`.
- If no suitable primitive or token exists: **do not hard-code a one-off**. Add the
  primitive to `src/components/ui/` and update `docs/design-system.md`.

---

## 4. Accessibility

Source of truth: [`docs/design-system.md` §11](./design-system.md).

Accessibility is **additive** — new behaviour is opt-in and must not change the default
experience for existing users.

### Non-negotiable rules

- Build from accessible primitives in `src/components/ui/` (`SkipLink`, `VisuallyHidden`,
  …).
- Consume the `data-*` preference layer and its tokens (`--reading-scale`,
  `--reading-leading-scale`, `--focus-ring-width`, motion gating). Never hard-code a
  font size, line-height, focus ring, transition duration, or colour governed by a
  preference or theme.
- Every interactive element: keyboard-operable, visible focus indicator, accessible name,
  correct semantics (roles, labels, landmarks, `aria-live`, `aria-describedby`,
  `aria-current`), respects `prefers-reduced-motion` / `data-motion`.
- **Cross-platform keyboard shortcuts.** Accept `event.metaKey || event.ctrlKey` for all
  modifier chords. Never hard-code a single platform's glyph (`⌘`, `Cmd`, `Ctrl`);
  derive the label from the running platform.
- **Default back-compat.** Defaults equal today's behaviour; persisted preferences use
  `?? default` — no destructive migration.
- **Contrast targets.** WCAG AA in `light`/`dark`; AAA (7:1) in `hc-*` themes.

### Ships with a11y tests

User-facing behaviour lands with:
- Assertions in unit/e2e (query by role/label).
- A `.stories.tsx` the Storybook a11y addon can check.
- For anything touching the default experience: a non-regression test proving no
  behaviour-changing `data-*` is applied until the user opts in.

---

## 5. E2E coverage

Coverage is gated by a ratchet (`scripts/coverage-ratchet.mjs`, run via
`npm run test:e2e:coverage`), comparing the live run against floors in
`coverage-baseline.json`.

- **Target ≥ 95% coverage** — both global and local — for every new or changed
  user-facing feature.
- **85% local is the hard floor.** If 95% is genuinely unreachable (browser APIs
  that cannot be driven headlessly, error paths requiring unsimulatable failures),
  stop and report back — state which files fall short, the exact percentages, and why.
  Do not silently settle for less.
- **Coverage may only increase.** Never lower a value in `coverage-baseline.json`.
- `src/editor/**` and `src/tours/**` are excluded from e2e coverage (covered by unit
  tests).

### Playwright rules

- Always run headless (its default). Never `--headed` or `--ui` in an agent context.
- Write specs that pass cross-platform. Use `ControlOrMeta+A` (not `Meta+A`) for
  select-all. Never assume the local OS.
- **No `force: true` on clicks.** Fix the locator instead.
- **No hardcoded timeouts** (`page.waitForTimeout`, `setTimeout`). Use Playwright's
  auto-waiting assertions.
- Use stable locators: `getByRole`, `getByText`, `getByTestId`, `data-testid`.

---

## 6. Testing philosophy

Unit tests (Vitest) and e2e tests (Playwright) prevent regressions. Treat them as a
safety net, not a checkbox.

- **TDD/BDD approach.** Write or extend a test before implementing a change; make it pass.
- **Never skip tests.** No `.skip`, `it.skip`, `describe.skip`, `xit`, `xdescribe`,
  `.fixme`, `.only`, commenting out, deleting, or weakening assertions to get a green run.
  The only exception: the user has explicitly agreed the feature is being removed.
- **No `any` in tests.** Use Vitest's typed mocks or typed shape objects.
- **`data-testid` is the primary selector.**
- **No `console.warn`/`console.error` output** in new tests — resolve the root cause.
- **Test the public API only.** No direct calls to private methods.
- **Coverage must rise** for changed areas, never drop.

---

## 7. Commits and branches

All commits, branch names, and PR titles must strictly follow
[Conventional Commits](https://www.conventionalcommits.org/).

### Branch naming

Form: `<type>/<kebab-description>` — e.g. `feat/user-login`, `fix/date-parse`.
Underscores allowed for suffixes (`feat/user-login_v2`).

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
`chore`, `revert`.

Exempt: `main`, `develop`, and automation/release branches (`dependabot/*`,
`release-please*`, `release/*`, `rc/*`, `pre-release/*`).

### Protected branches

**`main` is protected. Never write to it.** Do not commit, amend, rebase, force-push,
or otherwise rewrite `main`. Production releases land here only through the release
process.

**Always confirm before any branch-level git write**, regardless of which branch is
named. State the exact branch, the exact operation, and the blast radius; wait for
explicit approval.

### No AI assistant names

Branch names must never contain `claude` or `codex`. Commit messages must not reference
an assistant — no `Co-Authored-By` bot trailers, product names, or session links.

Use `npm run commit` for a guided Commitizen prompt.

---

## 8. Specification and help content

### Technical specification

[`docs/technical-specification.md`](./technical-specification.md) is the source-of-truth
feature spec. Any change that adds, removes, or alters user-facing behaviour must update
the relevant spec section **in the same PR**. Keep it in sync with the tests; a spec that
no longer matches the tests is a bug.

### Help content

The in-app Help Center (`/help`) lives in `src/help/content/en/<slug>.md`. User-facing
behaviour changes ship with a help update, the same way they ship with a test.

- Author/edit prose in `src/help/content/en/<slug>.md`.
- Register metadata in `src/lib/help/registry.ts` (`category`, `keywords`,
  `featureArea`, optional `tourId`).
- `src/lib/help/registry.test.ts` fails if any `featureArea` or guided tour lacks an
  article. Treat a red coverage test as a missing doc.
- Write for end users (task-oriented "how do I…"), not implementation detail.

---

## 9. Key commands

```bash
npm run dev            # Vite dev server
npm run lint           # ESLint
npm run lint:fix       # ESLint with auto-fix
npm run typecheck      # tsc --noEmit
npm run test:run       # Vitest (once, exits)
npm run test           # Vitest (watch mode — won't exit, Ctrl+C to stop)
npm run test:e2e       # Playwright e2e suite
npm run test:e2e:coverage  # Playwright with ratchet check
npm run commit         # Commitizen interactive prompt
```
