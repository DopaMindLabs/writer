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
- **Legacy support requires explicit permission.** Do not add new code paths, fallbacks,
  fixtures, or migrations whose purpose is to support legacy formats or behaviour (e.g.
  pre-Lexical plain-text bodies) without asking the user first and getting an explicit yes.
  Existing legacy handling stays as-is until its removal is explicitly agreed — don't extend
  it, and don't silently remove it either.

## Language (read before writing copy)

All user-facing copy and documentation use **British English** — e.g. _colour_, _organise_,
_customise_, _behaviour_, _centre_, _-ise_ not _-ize_. This applies to UI strings
(`src/i18n/locales/en/*.json`), Help Center articles (`src/help/content/en/*.md`), comments,
and docs.

- **Exceptions:** code identifiers, URL slugs, and CSS/token names stay as written (they are
  identifiers, not prose), as do established product/proper names already used across the app
  (e.g. **Help Center**). Don't rename a slug just to spell it the British way.
- When adding or editing copy, match the British spellings already in surrounding text.

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

## Accessibility (read before building UI)

Accessibility is a first-class, **additive** property of every feature — not an afterthought
and never a regression for existing users. [`docs/design-system.md` §11](./docs/design-system.md)
is the source of truth for the accessibility layer; align with it when building or changing UI.

- **Compose, honour the preference layer.** Build from the accessible primitives in
  `src/components/ui/` (including `SkipLink` and `VisuallyHidden`). Consume the `data-*`
  preference layer and its tokens (`--reading-scale`, `--reading-leading-scale`,
  `--focus-ring-width`, motion gating) — **never hard-code** a font size, line-height, focus
  ring, transition duration, or colour that a preference or theme should govern.
- **Operable & perceivable.** Every interactive element must be keyboard-operable with a
  visible focus indicator and an accessible name, use correct semantics (roles, labels,
  landmarks, `aria-live`, `aria-describedby`, `aria-current`), and respect
  `prefers-reduced-motion` / `data-motion`.
- **Additive by default.** New behaviour is opt-in and must not change the default experience
  for existing users. Defaults equal today's behaviour; persisted preferences stay
  back-compatible (`?? default`, no destructive migration).
- **Contrast.** Target **WCAG AA** in `light`/`dark` and **AAA (7:1)** in the `hc-*` themes;
  keep AAA-strict colour work inside the high-contrast themes.
- **Ships with a11y tests.** User-facing behaviour lands with accessibility tests the same way
  it lands with tests and help: assertions in unit/e2e (query by role/label), a `.stories.tsx`
  the Storybook a11y addon can check, and — for anything that touches the default experience —
  a non-regression test proving no behaviour-changing `data-*` is applied until the user opts
  in. Put new opt-in states behind their own story/test rather than editing a default snapshot.

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

### Running e2e (agents: headless, locally — don't defer to CI)

- **Always run Playwright headless** (its default — never `--headed` or `--ui` in an agent
  or CI environment) and run the suite yourself before pushing e2e-affecting changes rather
  than waiting for CI to find failures.
- If the browser is missing, install it with `npx playwright install chromium`. In sandboxed
  environments where `cdn.playwright.dev` is blocked, the identical Chrome for Testing build
  is on `storage.googleapis.com` (allowed): check the expected version, paths, and layout
  with `npx playwright install chromium --dry-run`, then download
  `https://storage.googleapis.com/chrome-for-testing-public/<version>/linux64/chrome-linux64.zip`
  and `…/chrome-headless-shell-linux64.zip`, unzip each into its install location under
  `$PLAYWRIGHT_BROWSERS_PATH` (zip roots match the expected layout), and `touch` the
  `INSTALLATION_COMPLETE` and `DEPENDENCIES_VALIDATED` markers in both directories.

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

## Commits & branches

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and are linted by
commitlint (the `commit-msg` hook); run `npm run commit` for a guided Commitizen prompt. Branch
names must be prefixed with a Conventional Commit type, enforced by the `pre-push` hook and the
**Branch name** CI check (`scripts/validate-branch-name.mjs`):

- Form: `<type>/<kebab-description>` — e.g. `feat/user-login`, `fix/date-parse`,
  `chore/bump-deps`. Underscores are allowed for suffixes (`feat/user-login_v2`).
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`,
  `revert`.
- Exempt: `main`, `develop`, and automation branches (`claude/*`, `dependabot/*`,
  `release-please*`).

### Protected branches (read before any git write)

**`main` is protected. Never write to it.** Do not commit, amend, rebase, force-push, or
otherwise rewrite `main` — including its history or any commit reachable from it. `main` holds
production releases and is changed only through the project's release process, never by an agent.

- **`main` means `main`.** If a request says "main" but the context points at the integration
  branch, do not assume — `develop` is the integration branch where day-to-day work lands.
- **Always confirm before any branch-level git write**, regardless of which branch is named, and
  **especially** before anything touching `main` or rewriting shared history (`develop`, release
  branches). State the exact branch, the exact operation, and the blast radius, and wait for
  explicit approval. When in doubt, ask — a wrong guess about the target branch is hard to undo.

## Help content (read before adding or changing features)

The in-app **Help Center** (`/help`) is end-user documentation that lives beside the
code. User-facing behavior changes ship with a help update, the same way they ship with
a test. When planning a feature, identify which help article(s) it adds or changes; when
implementing, update them in the same PR.

- **Author/edit** prose in `src/help/content/en/<slug>.md` (plain markdown; the first
  `#` line is the article title). Add translations later as
  `src/help/content/<locale>/<slug>.md`; missing locales fall back to English.
- **Register** metadata in `src/lib/help/registry.ts`: `category`, `keywords`,
  `featureArea`, and an optional `tourId`.
- **Enforcement:** `src/lib/help/registry.test.ts` fails if any `featureArea` or guided
  tour lacks an article, or a registered slug has no English body. Treat a red coverage
  test as a missing doc, not a test to weaken.
- **Reviewers** should check that feature PRs include the corresponding help change.
- Write for end users (task-oriented "how do I…"), not implementation detail.

## Key commands

- `npm run dev`: Vite dev server
- `npm run lint` and `npm run lint:fix`: ESLint
- `npm run typecheck`: `tsc --noEmit`
- `npm run test:run`: unit tests (Vitest, once)
- `npm run test:e2e`: Playwright e2e
