# Current E2E baseline

Evidence was read from `fix/writer-sync-beta-blockers` on 9 August 2026. Timing values are intentionally blank: no representative checkout or Playwright browser was available in the documentation environment, and invented timings would make later optimisation impossible to judge.

The implementer must fill the measurement tables in E0 before changing configuration, tags, workers or tests.

## Static evidence

### Runner configuration

`playwright.config.ts` currently has:

```ts
fullyParallel: true,
forbidOnly: !!process.env.CI,
retries: process.env.CI ? 2 : 0,
workers: process.env.CI ? 1 : undefined,
```

Consequences:

- CI serialises the entire local browser suite through one worker even though tests are declared fully parallel.
- A test that passes only on either of two retries still leaves the job green.
- Every test gets a fresh Playwright context, while two-device specs create and clean up another context through `openCoveredContext`.

### Coverage is active during ordinary E2E runs

`playwright.config.ts` always loads the Monocart reporter. `e2e/_helpers.ts` also starts Chromium JavaScript coverage in its automatic fixture, including extra pages and second-device contexts.

`package.json` currently defines:

```json
"test:e2e": "playwright test",
"test:e2e:coverage": "playwright test && node scripts/coverage-ratchet.mjs e2e"
```

Therefore `test:e2e` and the Playwright part of `test:e2e:coverage` perform the same instrumented run. The normal command is not a lightweight functional path.

### Current coverage scope

The Monocart source filter accepts only paths containing `src/` and excludes `src/editor/**`, `src/tours/**`, tests, declarations, JSON, CSS and several schema/type-only paths.

It excludes:

- `packages/writer-sync/src/**`;
- `packages/writer-qr/src/**`;
- any other package code exercised in the browser.

The global aggregate can also hide weak local coverage: a well-covered screen elsewhere in `src/` can compensate for an unvisited Writer Sync path.

The blocker branch has already closed the earlier “package measured nowhere” gap in the unit gate: `vite.config.ts` includes `packages/*/src/**/*.{ts,tsx}` under Vitest coverage, with global thresholds of 98% lines, 97% statements, 96% functions and 91% branches. Browser reachability for the package remains unreported, but pure engine branches are no longer outside every coverage gate.

### Current ratchet

`coverage-baseline.json` contains:

| Metric | Existing global floor |
|---|---:|
| Lines | 92% |
| Statements | 82% |
| Functions | 88% |
| Branches | 75% |

The cap is 100%. The ratchet may raise a floor when the measured value is sufficiently above it and fails CI if a local run would have raised the committed floor.

These values must never be reduced. The Writer repository separately sets a ≥95% target and an 85% hard local floor for new or changed feature paths. The existing global statements and branches floors are historical debt, not permission to seed a new Writer Sync gate below 85%.

### CI shape

`.github/workflows/e2e.yml` has two jobs:

- `unit`: install, lint, typecheck and Vitest coverage;
- `e2e`: install, Chromium, `npm run test:e2e:coverage`, then upload coverage/report artefacts.

The E2E job has a 20-minute timeout. There is no fast smoke or Writer Sync lane, and no sharding. The preview workflow separately runs `preview-smoke.spec.ts` against a deployed Vercel preview in Chromium so real response headers and CSP are exercised.

### Suite size

A combined inventory of the default suite and the Writer Sync diff found at least:

| Inventory | Count |
|---|---:|
| Existing local spec files discovered | 93 |
| Writer Sync spec files added on the feature/blocker lineage | 12 |
| Local spec files discovered in total | 105 |

Treat 105 as a lower-bound static inventory. E0 must replace it with the authoritative output of `npx playwright test --list` on the implementation base.

The Writer Sync lineage adds or materially exercises:

- `attachments-pair-sync.spec.ts`;
- `cloud-operation-journal.spec.ts`;
- `cloud-recovery-code.spec.ts`;
- `pair-again.spec.ts`;
- `pair-device-drop.spec.ts`;
- `pair-device.spec.ts`;
- `pair-expiry.spec.ts`;
- `pair-remove-disconnects.spec.ts`;
- `pair-sync-content.spec.ts`;
- `pair-sync-reconcile.spec.ts`;
- `pair-sync.spec.ts`;
- `peer-link-state.spec.ts`;
- plus existing cloud, CRDT, device and multi-tab specs.

### Known cost centres

- A real two-device exchange may legitimately wait up to 30 seconds for ICE candidate gathering.
- Several specs repeat the complete pairing exchange solely to reach the behaviour being asserted.
- `pair-again.spec.ts` performs two exchanges and sets a 120-second test budget.
- compaction and tombstone cases in `pair-sync-reconcile.spec.ts` use 120-second budgets.
- coverage is collected for the default page, extra pages and every second-device context.
- the local Vite E2E build runs once before the suite; sharding would repeat install/build work on every runner unless separately cached and merged.

No current sync spec uses Playwright tags. All targeted selection is therefore file-name based.

## E0 measurement procedure

Run on the latest `fix/writer-sync-beta-blockers` head before changing any E2E file.

### Environment record

Record:

```text
Base commit:
Node version:
npm version:
Playwright version:
CPU / logical cores:
RAM:
OS:
CI runner image or local machine:
```

### Commands

Use headless Chromium and retries disabled for stability measurements.

```bash
npm ci
npx playwright install chromium
npx playwright test --list

# Build cost, measured separately.
time npm run build:e2e

# Current one-worker functional/coverage-carrying baseline.
time npx playwright test --workers=1 --retries=0

# Machine-readable durations for the slow-spec table.
npx playwright test --workers=1 --retries=0 --reporter=json > /tmp/writer-e2e-baseline.json

# Repeat the critical sync files without retries to expose flakes.
npx playwright test \
  e2e/pair-device.spec.ts \
  e2e/pair-sync.spec.ts \
  e2e/pair-sync-content.spec.ts \
  e2e/pair-sync-reconcile.spec.ts \
  e2e/pair-again.spec.ts \
  e2e/pair-remove-disconnects.spec.ts \
  e2e/attachments-pair-sync.spec.ts \
  --workers=1 --retries=0 --repeat-each=3
```

If the full baseline exceeds the current CI timeout, record the timeout and preserve all partial JSON/report artefacts. Do not increase the timeout before measuring where the time is spent.

### Baseline results

| Measure | Run 1 | Run 2 | Run 3 | Median |
|---|---:|---:|---:|---:|
| `npm run build:e2e` | TBD | TBD | TBD | TBD |
| full suite, one worker, retries 0 | TBD | TBD | TBD | TBD |
| critical sync set, one worker, retries 0 | TBD | TBD | TBD | TBD |
| coverage report processing only | TBD | TBD | TBD | TBD |

### Stability results

| Spec/test | Attempts | First-pass failures | Retry-passes | Failure signature | Classification |
|---|---:|---:|---:|---|---|
| TBD | TBD | TBD | TBD | TBD | deterministic / timing / environment / product |

### Slowest specifications

| Rank | Spec | Duration | Set-up share | Test-body share | Suspected cost |
|---:|---|---:|---:|---:|---|
| 1 | TBD | TBD | TBD | TBD | TBD |
| 2 | TBD | TBD | TBD | TBD | TBD |
| 3 | TBD | TBD | TBD | TBD | TBD |
| 4 | TBD | TBD | TBD | TBD | TBD |
| 5 | TBD | TBD | TBD | TBD | TBD |
| 6 | TBD | TBD | TBD | TBD | TBD |
| 7 | TBD | TBD | TBD | TBD | TBD |
| 8 | TBD | TBD | TBD | TBD | TBD |
| 9 | TBD | TBD | TBD | TBD | TBD |
| 10 | TBD | TBD | TBD | TBD | TBD |

### Coverage record

Copy the actual summaries before any source-filter change.

| Scope | Lines | Statements | Functions | Branches |
|---|---:|---:|---:|---:|
| Existing app-wide `src/` scope | TBD | TBD | TBD | TBD |
| Writer Sync integration/UI paths | not currently reported | not currently reported | not currently reported | not currently reported |
| `packages/writer-sync/src/**` browser reachability | excluded | excluded | excluded | excluded |
| `packages/writer-qr/src/**` browser reachability | excluded | excluded | excluded | excluded |

## Optimisation acceptance targets

Targets are evaluated against the recorded median on the same class of machine.

- Functional full-suite wall time improves by at least 30%, or the branch records why the environment is already below the target and shows the achieved gain.
- The fast Writer Sync lane returns a result within five minutes at median and eight minutes at the 95th percentile on GitHub-hosted runners.
- The full coverage job remains below its 20-minute timeout with at least 20% headroom.
- Five consecutive smoke runs and three consecutive Writer Sync runs pass with retries disabled before CI retries are reduced.
- The ordinary functional run creates no `e2e-coverage` output and never calls Chromium coverage APIs.
- Existing global floors hold or rise.
- New Writer Sync local coverage is ≥85% on every metric before the gate is committed, with ≥95% the completion target.

If ≥85% local Writer Sync coverage is genuinely unreachable because a browser or provider path cannot be driven headlessly, stop and report the exact files, metrics and reason. Do not seed a lower baseline.
