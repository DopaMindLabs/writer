# AGENTS.md

> Bootstrap for every agent. Read this file first, then select and read the
> relevant `.agents/skills/*/SKILL.md` files before touching any code.
> Skills may be combined. When in doubt, read more skills, not fewer.
>
> This file is the repository bootstrap: it owns workflow, routing and the hard stops that
> apply across domains. Detailed standards live in the canonical documents named below.
> Keep a rule in one canonical place; if a skill or playbook disagrees with that source,
> treat the disagreement as a bug and fix it.

---

## Skill routing table

| Trigger | Skill |
|---|---|
| "find", "locate", "where is", "who calls", "trace", "callers of" | [`navigate-writer-codebase`](.agents/skills/navigate-writer-codebase/SKILL.md) |
| "plan", "design", "what files", "scope", "impact", "before I code" | [`plan-writer-change`](.agents/skills/plan-writer-change/SKILL.md) |
| "implement", "code it", "make the change", "write the code" | [`implement-writer-change`](.agents/skills/implement-writer-change/SKILL.md) |
| "audit", "review", "check", "risks in", "is this safe" | [`audit-writer-change`](.agents/skills/audit-writer-change/SKILL.md) |
| "broken", "stopped working", "regression", "flash", "flicker", "root cause", "bisect", "why did this break" | [`debug-writer-regression`](.agents/skills/debug-writer-regression/SKILL.md) |
| "test", "TDD", "vitest", "playwright", "coverage", "spec" | [`test-writer-changes`](.agents/skills/test-writer-changes/SKILL.md) |
| "component", "UI", "design system", "a11y", "i18n", "copy", "storybook" | [`build-writer-ui`](.agents/skills/build-writer-ui/SKILL.md) |
| "schema", "migration", "dexie", "table", "stores.ts", "LoremDB" | [`change-writer-persistence`](.agents/skills/change-writer-persistence/SKILL.md) |
| "collab", "yjs", "crdt", "multi-tab", "BroadcastChannel", "presence" | [`work-on-editor-collaboration`](.agents/skills/work-on-editor-collaboration/SKILL.md) |
| "writer sync", "writer-sync", "sync", "cross-device", "pairing", "P2P", "sync provider", "provider contract", "dexie cloud", "encryption", "escrow" | [`work-on-writer-sync`](.agents/skills/work-on-writer-sync/SKILL.md) |
| "sync hangs", "sync loop", "won't sync", "pairing failed", "frame rejected", "device limit", "cloud harness", "reproduce sync bug" | [`debug-writer-sync`](.agents/skills/debug-writer-sync/SKILL.md) |
| "handover", "hand off", "handoff", "pause", "resume later", "context running out", "pick up where" | [`handover-writer-work`](.agents/skills/handover-writer-work/SKILL.md) |

---

## Reference documents

| Document | When to read |
|---|---|
| [`docs/architecture.md`](./docs/architecture.md) | Before any change — layers, boundaries, call chains |
| [`docs/technical-specification.md`](./docs/technical-specification.md) | Before any user-facing behaviour change |
| [`docs/design-system.md`](./docs/design-system.md) | Before any UI work |
| [`docs/cloud-sync-beta.md`](./docs/cloud-sync-beta.md) | Before any cloud/encryption work |
| [`docs/agent-playbooks.md`](./docs/agent-playbooks.md) | Step-by-step runbooks (Locate / Plan / Audit / Change / Handover) — seed your todo list from them |
| [`docs/agent-navigation-benchmarks.md`](./docs/agent-navigation-benchmarks.md) | Navigation benchmark cases |
| [`CODING_STANDARDS.md`](./CODING_STANDARDS.md) | Before editing code — canonical coding, security and file-organisation rules |
| [`ACCESSIBILITY.md`](./ACCESSIBILITY.md) | Before user-facing or interaction-affecting work — canonical WCAG target, current gaps, and verification |

---

## Coding standards (read first)

[`CODING_STANDARDS.md`](./CODING_STANDARDS.md) is the single source of truth for code quality,
file organisation, structural design, lint/type safety and the Power-of-Ten limits. Read it
before editing code. Skills may repeat a short workflow guardrail, but they must link back to
this standard rather than redefine it.

- Apply the standard to every new or edited line. Existing backlog is not permission to add a
  new violation.
- Never weaken a rule, coverage floor or type-safety boundary, and never add a suppression to
  make a check pass. Follow the stop-and-ask rule in `CODING_STANDARDS.md` if compliance appears
  impossible.
- Treat the root-cause, proper-typing and comment-discipline rules in `CODING_STANDARDS.md` as
  hard gates. Do not ship a workaround or hack when the root cause cannot be fixed in scope;
  stop and report the blocker.
- Follow the separate compliance-refactor step in the task order below when a touched file must
  first be brought up to standard.
- **Legacy support requires explicit permission.** Do not add new code paths, fallbacks,
  fixtures, or migrations whose purpose is to support legacy formats or behaviour (e.g.
  pre-Lexical plain-text bodies) without asking the user first and getting an explicit yes.
  Existing legacy handling stays as-is until its removal is explicitly agreed — don't extend
  it, and don't silently remove it either.

## Security (read before changing a trust boundary)

[`CODING_STANDARDS.md` § "Security engineering"](./CODING_STANDARDS.md#security-engineering) is the canonical
secure-coding baseline. Review security-sensitive changes against the current
[OWASP Top 10:2025](https://owasp.org/Top10/) and any feature-specific threat model. OWASP is
a baseline taxonomy, not an exhaustive checklist and not a substitute for threat modelling.

Security is not limited to server code. Browser APIs, local persistence, imported/rendered
content, settings that alter security behaviour, cryptography, sync/P2P/provider boundaries,
dependencies and build configuration can all introduce security-relevant behaviour. Apply the
same root-cause, validation and adversarial-test standard at those boundaries.

## Task order (read before starting work)

The canonical sequence for any change, reconciling the rules that each demand to come
"first":

1. **Compliance refactor** (only if needed): if the files you must edit already violate the
   standards, land the `refactor:` commit first, scoped as above.
2. **Failing test first (TDD).** Write or extend the unit/e2e test that describes the
   intended behaviour.
3. **Implement** until green, keeping lint/typecheck clean as you go.
4. **Same PR:** update the spec section, help article(s), a11y tests, and `.stories.tsx`
   the change touches.
5. **Run the gates:** `npm run lint`, `npm run typecheck`, `npm run test:run`;
   `npm run test:e2e` for UI-facing changes; `npm run test:e2e:coverage` for
   coverage-affecting changes.
6. **Conventional Commit** and push; the PR title must itself be a valid Conventional
   Commit subject.

**When a stop-and-ask rule fires and no user can answer** (headless or autonomous run):
stop that thread of work, finish what does not depend on the answer, and surface the
question prominently in your report or PR description. Never guess your way past a
stop-and-ask rule.

## Todo tracking (read before starting multi-step work)

Every task with more than one step is tracked against a **live todo list** — the single
source of truth for what is done, what is in progress, and what is still outstanding. This
is not optional bookkeeping: it is how work stays resumable, auditable, and safe to hand
over. Every skill in [`.agents/skills/`](.agents/skills/) restates this discipline for its
own workflow; this section is canonical.

- **Maintain one list per task.** Use your agent's todo/task tool where it has one;
  otherwise keep an explicit checklist in your working notes. Each item is a single,
  verifiable outcome, phrased in the imperative.
- **Runbooks seed the list.** Any ordered procedure is a runbook: a skill's numbered steps
  or checklist, the Task order above, or a playbook workflow in
  [`docs/agent-playbooks.md`](./docs/agent-playbooks.md). Turn the runbook into the todo
  list — one item per step, in order, **before** you start — then extend the list with work
  you discover as you go.
- **Keep exactly one item in progress.** Mark an item in-progress when you begin it and
  completed the moment it is verified done. Never batch the updates at the end, and never
  mark an item done that is not actually done — a failing test, a skipped gate, and an
  unanswered stop-and-ask each keep their item open.
- **The list is the source of truth for remaining work** and the backbone of every
  handover: a handover is the current todo list plus where you stopped (see
  [`handover-writer-work`](.agents/skills/handover-writer-work/SKILL.md)). Reconcile the
  list with reality before you hand over, pause, or report a task complete.

## Language (read before writing copy)

All user-facing copy and documentation use **British English** — e.g. _colour_, _organise_,
_customise_, _behaviour_, _centre_, _licence_ (`-ce` for nouns), _-ise_ not _-ize_. This applies to UI strings
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
- **Survey the whole catalogue before choosing a primitive.** When planning *any* UI
  addition or change — even a single line of copy — read the full component inventory first
  (`docs/design-system.md` component tables and `src/components/ui/`, mirrored in Storybook)
  and pick the primitive whose **documented use** matches the intent: a persistent notice is
  `InlineBanner`, inline status is `StatusGlyph`, row state is `StatusBadge`, meta/blurb voice
  is the `caption` typography, and so on. Never choose by copying whatever the neighbouring
  code happens to use.
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

## Accessibility (read before user-facing or interaction-affecting work)

[`ACCESSIBILITY.md`](./ACCESSIBILITY.md) is the single source of truth for conformance targets,
known gaps and verification. [`docs/design-system.md` §11](./docs/design-system.md) owns the
tokens, primitives and preference implementation. Read `ACCESSIBILITY.md` whenever behaviour
changes what a person can perceive, operate, understand or recover from; read the design system
as well when the change affects UI.

Writer targets **WCAG 2.2 Level AAA for every applicable success criterion**. AAA includes all
applicable Level A and AA criteria; it is not shorthand for 7:1 contrast. Treat AA as an
interim floor while known gaps are closed, not as the final target, and do not claim AAA until
the conformance evidence in `ACCESSIBILITY.md` supports it.

- Accessibility is a baseline, not an opt-in theme. Default themes and interactions must work
  towards the AAA target; accessibility preferences may enhance that baseline but cannot be the
  only conforming path.
- Accessibility is functional as well as visual. Settings, shortcuts, focus/state transitions,
  status and error announcements, timing, gestures, preference persistence and recovery flows
  are in scope even when no component markup changes.
- Use accessible names, semantics, keyboard operation, visible focus and reduced-motion
  behaviour from the shared primitives. Keep shortcuts cross-platform in both logic and labels.
- For text, target WCAG 2.2 SC 1.4.6 in every theme: at least 7:1 for normal text and 4.5:1 for
  large text, subject to the criterion's exceptions. Apply the appropriate WCAG criterion to
  non-text UI rather than treating 7:1 as a universal graphics ratio.
- Ship accessibility assertions with user-facing behaviour and manually review the applicable
  AAA criteria. Automated axe/Storybook checks are supporting evidence, not proof of AAA.
- Do not introduce a new accessibility gap. If a new or changed surface cannot meet an
  applicable AAA criterion, stop and ask rather than redefining the target or hiding the gap.

## E2E test coverage (ratcheted)

E2E coverage is gated by a ratchet (`scripts/coverage-ratchet.mjs`, run via
`npm run test:e2e:coverage`) that compares the live run against the **global** floors in
`coverage-baseline.json` and only ever raises them toward the cap. The ratchet enforces the
whole-suite aggregate; **local** (per-feature) coverage is your responsibility to verify and
is checked in review.

- **Target ≥ 95% coverage across the board — both global and local.** Every new or changed
  user-facing feature must reach **≥ 95%** e2e coverage of its own code paths (local) and must
  not pull any global metric below 95%. Add Playwright specs under `e2e/` alongside the
  feature; don't rely on unit tests to cover flows a user can click through.
- **85% local is a hard floor — never below it.** If 95% is *genuinely* unreachable for a
  feature (e.g. browser APIs that can't be driven headlessly, error paths that need
  unsimulatable failures), **stop and report back to the user before proceeding, and ask for
  next steps** — do not silently settle for less or carry on. State which files fall short, the
  exact percentages, and *why* 95% could not be met, then wait for the user's direction. Even
  with a justified exception, local coverage for the feature **must not drop below 85%** — if it
  would, the work is not done; add tests or refactor for testability instead of lowering the
  bar.
- **Coverage may only increase.** Never lower a value in `coverage-baseline.json` or relax the
  ratchet to make CI pass — fix the tests instead. When a run raises the floors, commit the
  updated `coverage-baseline.json`.
- Run `npm run test:e2e:coverage` before committing coverage-affecting changes; it gates CI.
- `src/editor/**` and `src/tours/**` are excluded from e2e coverage (covered by unit tests); the
  95% target / 85% floor applies to the rest of the app.

### Running e2e (agents: headless, locally — don't defer to CI)

- **Always run Playwright headless** (its default — never `--headed` or `--ui` in an agent
  or CI environment) and run the suite yourself before pushing e2e-affecting changes rather
  than waiting for CI to find failures.
- **Write specs that pass cross-platform — agents run on macOS, CI runs on Linux.** Never
  assume the local OS. The trap is keyboard modifiers: `Meta` is Cmd on macOS (so `Meta+a`
  selects all locally) but the Super/Windows key on Linux/Windows, where the same chord is a
  no-op — leaving only a caret. Use Playwright's platform-aware `ControlOrMeta+A` (or select
  text explicitly) for select-all, copy, paste, and similar shortcuts. This bites twice: a
  positive assertion (toolbar *appears* on selection) flakes/times out on CI, while a negative
  one (toolbar *absent*) passes vacuously without ever exercising the behaviour. Prefer asserting
  both the present and absent states with the same helper so a broken selection can't green a
  test. The same goes for any OS-specific path, line-ending, or timing assumption.
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
protect existing, working behaviour from unintended change. Treat them as a safety net,
not a checkbox.

- **Take a TDD/BDD approach.** Before implementing a change, write or extend a test that
  describes the intended behaviour, then make it pass. New behaviour ships with a test that
  would fail without it.
- **A green run is not the objective.** Stability and the absence of unintended changes
  are. Passing tests are a means of confirming that, not the goal itself.
- **Tests must never be skipped — this rule is not to be violated.** When a test fails, find
  the root cause and fix the regression. Do not skip (`.skip`, `it.skip`/`describe.skip`,
  `xit`/`xdescribe`, `test.skip`, `.fixme`), focus (`.only`), comment out, delete, mark
  expected-to-fail, weaken assertions on, or rewrite a test just to get a green run — and do
  not add lint/type suppressions to a test for the same purpose. A failing test is signalling
  that behaviour changed; diagnose why.
- The **only** exception is when the user has explicitly agreed that the feature under
  test is being removed or is redundant. In that case, remove the test as part of that
  agreed change. Anything short of that — including a "temporary" skip — requires asking the
  user first.
- Run `npm run test:run` (and `npm run test:e2e` for UI-facing changes) before committing,
  alongside `npm run lint` and `npm run typecheck`.

### Test-suite guardrails

- **No hardcoded waits.** Never `page.waitForTimeout(...)` or a hand-rolled
  `setTimeout` wait in a spec — use Playwright's auto-waiting assertions
  (`await expect(locator).toBeVisible()`, …) so the test waits for the condition, not
  a guess at the clock.
- **No `{ force: true }`** on clicks or fills. A forced interaction papers over a broken
  locator or an unusable component — fix the locator or the component instead.
- **Stable locators only.** Prefer `getByRole` / `getByText` / `getByTestId`;
  `data-testid` is the primary selector for elements without a meaningful accessible
  role. Never select on CSS classes or DOM structure that a refactor may change.
- **No `any` in tests.** Use Vitest's typed mocks or typed shape objects — tests follow
  the same type discipline as production code.
- **No `console.warn` / `console.error` output** from new tests — resolve the root cause
  rather than tolerating noisy output.
- **Test the public API only.** Assert observable behaviour; no direct calls to private
  methods or internal state.

## Commits & branches

**Commit messages, branch names, and PR titles must all strictly follow
[Conventional Commits](https://www.conventionalcommits.org/)** — no exceptions. Commits are
linted by commitlint (the `commit-msg` hook); run `npm run commit` for a guided Commitizen
prompt. The **PR title** must itself be a valid Conventional Commit subject
(`<type>(<scope>): <description>`, e.g. `feat(citations): import BibTeX`) — the squash-merge
commit is derived from it, so a non-conforming title breaks the convention on the default
branch. Branch names must be prefixed with a Conventional Commit type. This is enforced at
every stage by `scripts/validate-branch-name.mjs`: the `pre-commit` hook blocks the first
commit on a misnamed branch (fail fast), the `pre-push` hook blocks the push, the **Branch
name** CI check gates the PR, and the `post-checkout` hook prints a non-blocking warning
the moment a misnamed branch is checked out (`--warn` mode):

- **Never bypass Git hooks.** Do not use `--no-verify` with `git commit`, `git push`, or any
  other Git command. Pre-commit, commit-message, and pre-push hooks must run and pass; fix
  failures instead of bypassing them.
- Form: `<type>/<kebab-description>` — e.g. `feat/user-login`, `fix/date-parse`,
  `chore/bump-deps`. Underscores are allowed for suffixes (`feat/user-login_v2`).
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`,
  `revert`.
- Exempt: `main`, `develop`, and automation / release branches (`dependabot/*`,
  `release-please*`, `release/*`, `rc/*`, `pre-release/*`).
- **No AI assistant names.** Branch names must never contain `claude` or `codex`
  (enforced by `validate-branch-name.mjs`), and commit messages must not reference
  an assistant — no `Co-Authored-By` bot trailers, product names, or session links
  (enforced by `scripts/check-commit-attribution.mjs` on the `commit-msg` hook).
  The **author identity** on the commit itself is checked by the same script:
  `claude` / `codex` / `anthropic` / `openai` in the name or email are rejected,
  so a valid message under a vendor-noreply mailbox no longer slips through.
  The sole allowed occurrence in a message is the literal `.claude` config
  folder path, so a commit editing `.claude/settings.json` can still name the file.

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

### Issue and PR templates (hard rules)

- Use `.github/PULL_REQUEST_TEMPLATE.md` and the issue forms in `.github/ISSUE_TEMPLATE/`
  exactly as provided: do not add, remove, or reorder sections; do not delete or alter
  hidden HTML comments or the maintainer-only blocks. **Automated checks and flows validate
  submissions against the actual templates exactly** — a non-conforming issue or PR will be
  rejected.
- Write acceptance criteria in Gherkin language (Given / When / Then), one scenario per
  bullet.
- **The PR checklist item "I as a human confirm all changes were reviewed prior to opening
  this PR" is a human-only attestation. Agents must NEVER tick it** — it exists precisely to
  record an explicit human intervention. Leave it unticked; only the human author checks it.
- **Agent reviewers must verify PR conformance before approving, commenting, or ticking.**
  Re-read the current `.github/PULL_REQUEST_TEMPLATE.md` on the branch (the source of truth,
  not memory), confirm the PR **title** is a valid Conventional Commit subject, and confirm
  the PR **body** matches the template exactly — every section present and in order, none
  added, removed, or reordered, hidden comments intact. If the title or body deviates, **flag
  the specific deviation as a PR comment** and leave the agent-reviewer box unticked.
- **Review comments follow `audit-writer-change`'s comment contract.** State one concrete
  problem, why it matters, the proposed root-cause technical fix (pseudocode where useful),
  and observable acceptance criteria/checklist. Map to OWASP or WCAG when genuinely applicable.
- **The PR checklist item "Agent reviewer: I re-read `.github/PULL_REQUEST_TEMPLATE.md` and
  confirm this PR's title and description conform to it exactly" is the one attestation agents
  DO tick** — but only after actually performing that verification, and only when nothing was
  flagged. It is the reviewer counterpart to the human-only item and must never be conflated
  with it.
- Always open PRs as **Draft**; a maintainer marks them ready for review.

## Specification (read before changing behaviour)

[`docs/technical-specification.md`](./docs/technical-specification.md) is the source-of-truth
feature spec, derived from the test suite. Any change that adds, removes, or alters
user-facing behaviour must update the relevant spec section **in the same PR** — the same way
it ships with a test and a help update.

- **Keep it in sync with the tests.** The spec describes flows the e2e/unit suites assert;
  when you change what the tests assert, change the matching spec section so the two never
  disagree. Treat a spec that no longer matches the tests as a bug, not stale prose.
- **Keep the metadata current.** Update the version, feature list, and described flows so they
  reflect reality (e.g. the spec's version string should track `package.json`, not lag it).
- **Scope.** Update the sections your change touches; don't rewrite unrelated areas. If a
  change has no user-facing behaviour, no spec update is needed — say so in the PR.

## Help content (read before adding or changing features)

The in-app **Help Center** (`/help`) is end-user documentation that lives beside the
code. User-facing behaviour changes ship with a help update, the same way they ship with
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
- **Structure and writing rules** live in `build-writer-ui`; use its Help article structure
  for English authoring and `audit-writer-change` for review. Keep this bootstrap focused on
  the shipping requirement rather than duplicating the prose rules here.

## Key commands

```bash
npm run dev              # Vite dev server
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint
npm run lint:fix         # ESLint with auto-fix
npx eslint <file> --max-warnings=0  # targeted lint check
npm run test:run         # Vitest (once)
npm run test:e2e         # Playwright e2e
npm run test:e2e:coverage  # e2e + ratchet check
npm run commit           # Commitizen prompt
```
