# Writer Sync E2E improvement runbook

Reference runbook for a documentation-reviewed implementation branch off `fix/writer-sync-beta-blockers`.

## Pinned reference state

| Field | Value |
|---|---|
| Repository | `DopaMindLabs/writer` |
| Reference branch | `build/writer-sync-e2e-runbook` |
| Base branch | `fix/writer-sync-beta-blockers` |
| Base commit at reference creation | `ed17646d3356afea4021bb4773a4b2ad7c203a0c` |
| Implementation branch | `test/writer-sync-e2e-optimisation` |
| Implementation PR base | `fix/writer-sync-beta-blockers` until that branch merges; then rebase/retarget to `develop` |

The blocker branch may advance. Before implementation, compare its latest head with the pinned commit and re-read any changed `playwright*`, `e2e/**`, coverage, workflow or repository-policy files. Start the implementation from the latest blocker head, not from this documentation commit.

## How to use this runbook

Seed the agent's live todo list from E0–E7, one item per acceptance criterion. Keep one item in progress. For every code-changing slice, follow `AGENTS.md` task order:

1. compliance refactor first when a touched file already violates the coding standard;
2. failing executable assertion/test first;
3. implement to green;
4. refactor under green;
5. update affected specification/help/a11y/story artefacts in the same PR when behaviour changes;
6. run targeted gates, then the complete required gates;
7. Conventional Commit and draft PR.

Do not begin E1 until E0 measurements are committed to the implementation branch. Do not begin E4's new local ratchet until the dependency decision is recorded. Do not enable two CI workers until E3 proves isolation with retries disabled.

## Scope

### In scope

- normal Playwright execution without coverage overhead;
- native test tags and targeted commands;
- Writer Sync smoke, provider and recovery selection;
- deterministic multi-context isolation;
- controlled two-worker CI parallelism;
- local Writer Sync coverage from one raw V8 collection;
- missing beta-critical reconnection, cloud convergence, repeated-attachment and production-decoder journeys;
- reporter artefacts and measurement.

### Out of scope

- product refactors unrelated to a failing E2E invariant;
- changing the Writer Sync protocol or crypto design;
- implementing more-than-two-device P2P fan-out;
- cross-device CRDT merging/presence, which the specification records as unwired;
- lowering coverage or increasing timeouts to conceal runtime;
- cross-runner sharding before E7's decision gate;
- sharing browser state between tests.

## Order of work

1. E0 — measure and freeze the baseline.
2. E1 — separate functional execution from coverage collection.
3. E2 — tag and expose targeted commands.
4. E3 — prove isolation, then enable two workers.
5. E4 — generate app and Writer Sync coverage profiles and ratchet locally.
6. E5 — close P0 coverage gaps and reduce redundant real-pairing cost.
7. E6 — add the fast CI lane and stabilise retries.
8. E7 — decide whether sharding is justified.

---

## E0 — Measurement and authoritative inventory

### Work

1. Cut `test/writer-sync-e2e-optimisation` from the latest `fix/writer-sync-beta-blockers` head.
2. Re-read `AGENTS.md`, the planning/testing/Writer Sync skills, `docs/architecture.md`, the protocol/threat-model docs and every file in the infrastructure table in `IMPLEMENTATION.md`.
3. Run `npx playwright test --list` and replace the static lower-bound count in `BASELINE.md` with authoritative suites/tests.
4. Run the commands in `BASELINE.md` with one worker and retries zero.
5. Record build time, full-suite wall time, critical sync wall time, ten slowest specs, first-pass failures and the existing coverage summary.
6. Classify every first-pass failure as deterministic product, deterministic test, timing, or environment. Preserve traces and exact messages.
7. Commit only measurement/inventory documentation as `docs(e2e): record Writer Sync baseline`.

### Acceptance

- [ ] Base SHA, environment, runner size and tool versions are recorded.
- [ ] `--list` counts replace the static estimate.
- [ ] Full one-worker and critical-sync timings are real measurements.
- [ ] Retry count is zero for stability measurements.
- [ ] Every failure has a classification and artefact reference.
- [ ] No E2E/config/workflow source changed in E0.

### Stop conditions

- If the suite does not finish within the current 20-minute CI limit, preserve partial data and identify the last completed/active spec. Do not raise the timeout.
- If a beta blocker is still failing deterministically, report it against `fix/writer-sync-beta-blockers`. Do not make test infrastructure mask it.

---

## E1 — Separate functional execution from coverage

### Work

1. Add `playwright.local.config.ts` with the shared typed local configuration factory.
2. Change `playwright.config.ts` to `collectCoverage: false` and remove the Monocart reporter.
3. Add `playwright.coverage.config.ts` with `collectCoverage: true` and raw coverage reporter.
4. Change `e2e/_helpers.ts` so coverage starts only when config metadata enables it.
5. Dynamically import `addCoverageReport` only on coverage teardown.
6. Preserve second-context teardown in both functional and coverage modes.
7. Update the existing commands without adding tags yet.
8. Keep CI workers at one for this slice.

### Failing assertion first

Before implementation, demonstrate that current `npm run test:e2e -- e2e/smoke.spec.ts` creates/processes coverage. Add an executable check that expects no coverage output for the functional config; confirm it fails before the split and passes afterwards.

### Acceptance scenarios

- Given an ordinary functional run, when one smoke spec completes, then no coverage API is started and no `e2e-coverage` output is created.
- Given the coverage config, when the same spec completes, then raw coverage exists for the default page and any extra covered page.
- Given a two-device spec fails mid-assertion, when fixture teardown runs, then the second browser context closes and no instrumentation stop is attempted on an uninstrumented page.
- Given the deployed-preview config, when its smoke runs, then coverage remains disabled.

### Gates

```bash
npx playwright test --config=playwright.config.ts e2e/smoke.spec.ts
npx playwright test --config=playwright.coverage.config.ts e2e/smoke.spec.ts
npx eslint playwright.local.config.ts playwright.config.ts playwright.coverage.config.ts e2e/_helpers.ts --max-warnings=0
npm run typecheck
```

### Commit

`test(e2e): separate functional and coverage runs`

---

## E2 — Tags and targeted commands

### Work

1. Add native tags from `COVERAGE-MATRIX.md` to existing Writer Sync specs.
2. Tag a deliberately small P0 subset `@smoke`; do not tag every `@sync` test as smoke.
3. Add `test:e2e:smoke` and `test:e2e:sync`, both with retries zero.
4. Use `npx playwright test --list --grep ...` to record the exact selected tests.
5. Add a guard test/script that fails when the smoke selection is empty or unexpectedly includes preview-only specs.
6. Do not change test bodies, workers or retry policy in this slice.

### Required smoke set

At minimum:

- app boots and reaches a usable seeded route (`smoke.spec.ts` or equivalent);
- one real P2P pairing catches up and transfers later writing (`pair-sync.spec.ts`);
- removal stops live transfer (`pair-remove-disconnects.spec.ts`);
- removed device can re-pair and resume (`pair-again.spec.ts`);
- an attachment crosses and survives reload (`attachments-pair-sync.spec.ts`);
- cloud key set-up/unlock reaches an encrypted read (`cloud-sync.spec.ts`);
- operation journal rejects an untrusted author/table, if this keeps the lane within target time; otherwise retain under `@sync @security` outside smoke.

### Acceptance scenarios

- Given `--grep @smoke`, then only explicitly selected immediate beta-confidence tests are listed.
- Given `--grep @sync`, then all P2P and cloud cross-device tests are listed and `multi-tab-sync.spec.ts` is not selected merely by filename.
- Given a smoke test fails, then CI does not retry it.
- Given the full functional command, then tags do not exclude any existing test.

### Gates

```bash
npx playwright test --list --grep @smoke
npx playwright test --list --grep @sync
npm run test:e2e:smoke
npm run test:e2e:sync
npm run lint
npm run typecheck
```

### Commit

`test(e2e): tag Writer Sync journeys`

---

## E3 — Isolation and two-worker parallelism

### Work

1. Complete every audit row in `IMPLEMENTATION.md` §Parallel-safety audit.
2. Fix state leaks with fixtures and per-test generated identifiers, never with file-wide serial mode unless an external shared resource makes serial execution intrinsic.
3. Keep multiple device pages within one test; do not split a two-device journey across tests.
4. Run the full suite and Writer Sync subset repeatedly at one and two workers with retries zero.
5. Compare wall time, CPU contention, first-pass failure count and coverage collection separately.
6. Set CI local configuration to two workers only after both functional and coverage configurations pass.
7. Leave any genuinely non-parallel-safe `describe` localised and document the shared resource that forces it.

### Acceptance scenarios

- Given two workers and three repeated Writer Sync runs, then tests pass without retries and no device/database state crosses test boundaries.
- Given an assertion fails after opening a second context, then teardown closes that context before the next test.
- Given two WebRTC pairings execute in parallel workers, then their sessions, device ids and IndexedDB state remain independent.
- Given the two-worker candidate is slower than one worker, then the branch keeps one worker and records the contention rather than forcing parallelism.

### Stability gate

```bash
npx playwright test --workers=1 --retries=0 --repeat-each=3
npx playwright test --workers=2 --retries=0 --repeat-each=3
npm run test:e2e:sync -- --workers=2 --repeat-each=3
npx playwright test --config=playwright.coverage.config.ts --workers=2 --retries=0
```

### Commit

`test(e2e): enable parallel-safe CI execution`

---

## E4 — App and Writer Sync coverage profiles

### Decision required before code

Recommended: declare `monocart-coverage-reports` as a direct dev dependency at the version compatible with the installed `monocart-reporter`, then generate two filtered reports from one raw collection.

This is a new dependency declaration. Stop and obtain explicit user approval. Record the decision in the PR/implementation notes.

Fallback if declined: run two Monocart coverage configs sequentially, one with the existing app filter and one with the Writer Sync filter. Accept the extra runtime only if the 20-minute gate retains headroom.

### Work

1. Make the coverage config emit raw V8 data broad enough for both profiles.
2. Add pure source-filter functions with mapping tests.
3. Add `scripts/generate-e2e-coverage.mjs` using the approved public API.
4. Generate `e2e-coverage/app/coverage-summary.json` with exact parity to the current global `src/` scope.
5. Generate `e2e-coverage/writer-sync/coverage-summary.json` for E2E-relevant Writer Sync integration/UI paths.
6. Emit a browser-reachability report for package paths, but retain the existing Vitest package coverage gate as authority over pure engine branches.
7. Extend the ratchet script with `writerSyncE2E`.
8. Improve tests until every local Writer Sync metric is at least 85%.
9. Seed the new baseline, then continue towards 95% across every metric.
10. Preserve or raise the existing `e2e` floors.

### Acceptance scenarios

- Given one raw browser collection, when reports are generated, then app-wide and Writer Sync summaries are produced without a second Playwright run.
- Given the same code/tests as before, then the new app summary matches the old summary and every existing ratchet floor holds.
- Given unrelated well-covered app code, then it cannot raise the Writer Sync local summary.
- Given any Writer Sync metric below 85%, then the new ratchet is not seeded and implementation stops for tests/refactoring or the required user decision.
- Given coverage improves enough to raise a floor, then CI fails until the locally updated baseline is committed.

### Gates

```bash
npm run test:e2e:coverage:collect
npm run test:e2e:coverage:reports
node scripts/coverage-ratchet.mjs e2e
node scripts/coverage-ratchet.mjs writerSyncE2E
npm run test:coverage
npm run lint
npm run typecheck
```

### Commits

Use two commits if dependency/report plumbing and coverage additions are independently reviewable:

1. `test(coverage): add Writer Sync E2E profile`
2. `test(sync): raise local E2E coverage`

---

## E5 — Close P0 gaps and reduce redundant pairing cost

Work each sub-slice TDD-first. Do not mix product fixes with infrastructure commits.

### E5.1 — Reconnection catch-up

Add `pair-reconnect-catch-up.spec.ts` from the Gherkin scenario in `COVERAGE-MATRIX.md`.

The test must:

- establish two distinct device contexts;
- complete initial pairing/catch-up;
- close or drop the actual peer session through a public/test seam reflecting real behaviour;
- create content while the peer is unavailable;
- establish the supported fresh session/re-pair path;
- assert missed data materialises and survives reload.

If no product route can establish a fresh trusted session without repeating QR, drive re-pairing and name the scenario honestly. Do not claim automatic reconnect.

### E5.2 — Passphrase-only cloud convergence

Add the B3 journey only with a deterministic provider-backed harness and a unique account/realm per worker. Direct database copying, an in-memory callback shared by both contexts or planting the expected final row is not valid cloud E2E evidence.

If no safe harness exists, retain the blocker as an integration/harness gap and stop for scope/authority. Do not add real evaluation-account credentials or send more than the authorised test traffic.

### E5.3 — Repeated/poisoned attachments

Extend `attachments-pair-sync.spec.ts` or add the focused recovery spec.

Assertions:

1. an incomplete sibling attachment does not prevent offering a valid attachment;
2. image 1 and image 2 transfer in the same direction on one live pair;
3. both images render and survive receiver reload;
4. a later text update crosses, proving the link was not killed by backpressure/cursor failure.

Prefer a typed E2E-only seam to an oversized fixture if a smaller transport budget reproduces the former overflow deterministically. The seam must be absent from production builds and have a build-gate test.

### E5.4 — Production QR ponyfill/CSP

Add a focused deployed-preview test that drives the WASM decoder where native `BarcodeDetector` is unavailable. WebKit is preferred because it represents Safari's engine; a forced-ponyfill preview build is acceptable when its production-dead seam is enforced.

Installing WebKit for this one job is allowed only in the preview workflow. Do not multiply the complete local suite across browsers.

### E5.5 — Pairing set-up consolidation

After gaps are green, use E0 durations to select consolidation candidates. Begin with `pair-sync.spec.ts` because its two tests repeat pairing for two halves of one promise. Preserve assertion names with `test.step`.

Do not consolidate:

- expiry/re-pair trust-state cases;
- malformed/untrusted security cases;
- cloud and P2P providers;
- tests whose independent fresh install is part of the invariant.

### Slice gates

For each new spec:

```bash
npx playwright test e2e/<new-or-changed>.spec.ts --workers=1 --retries=0 --repeat-each=3
npx playwright test e2e/<new-or-changed>.spec.ts --workers=2 --retries=0 --repeat-each=3
npm run test:e2e:sync
npm run test:e2e:coverage
npm run lint
npm run typecheck
npm run test:run
```

### Product-defect rule

If a new failing E2E exposes broken product behaviour, stop the optimisation slice. File/associate the blocker, fix root cause on an approved product branch, update spec/help where behaviour changes, then rebase the E2E branch. Do not add a wait, retry or seam that makes broken behaviour look green.

---

## E6 — Fast CI lane, artefacts and retry policy

### Work

1. Add `e2e-sync`/smoke job using the existing pinned actions and browser cache pattern.
2. Run it in parallel with unit and full coverage jobs.
3. Set fast lane retries to zero and timeout to ten minutes.
4. Upload trace/report on failure.
5. Rename the existing E2E job to `e2e-coverage` if required, preserving the required-check mapping or documenting the branch-protection update a maintainer must make.
6. Upload app, Writer Sync and raw coverage artefacts with the current retention policy.
7. Run five consecutive smoke and three consecutive Writer Sync executions with retries zero.
8. Only then reduce the full CI retry count from two to one and enable `failOnFlakyTests`.

### Acceptance scenarios

- Given a P0 Writer Sync regression, then the fast job fails without waiting for the coverage job.
- Given a test passes only on retry in the full job, then CI still reports failure once flaky-test enforcement is enabled.
- Given the fast job passes, then the full coverage job still runs and remains required.
- Given a failure, then trace, screenshot and HTML/report artefacts identify the original attempt and any retry.

### Gates

```bash
npm run test:e2e:smoke
npm run test:e2e:sync
npm run test:e2e
npm run test:e2e:coverage
npm run lint
npm run typecheck
npm run test:run
```

### Commit

`ci(e2e): add fast Writer Sync feedback`

---

## E7 — Sharding decision, not an automatic task

### Adopt only when all conditions hold

- Two-worker coverage still leaves less than 20% timeout headroom.
- E0/E6 data shows test execution dominates install/build/report processing.
- Raw Monocart coverage merges with identical app and Writer Sync summaries.
- Playwright blob reports merge and retain traces.
- Cloud/provider resources are unique per shard.
- Two shards give a material wall-time gain without excessive compute.

### Trial

1. Keep branch protection unchanged during the experiment.
2. Run two shards with raw coverage output and unique artefact names.
3. Merge Playwright reports and Monocart raw coverage in a separate job.
4. Compare summary parity against an unsharded run.
5. Compare wall time, total runner minutes, failure diagnosis and artefact size.
6. Adopt only if wall time improves by at least 20% and no coverage/report fidelity is lost.

### Reject sharding when

- repeated builds consume most of the saved test time;
- coverage merge changes percentages or drops source maps;
- the cloud harness cannot isolate shard state;
- two local workers already meet the target with adequate timeout headroom.

---

## Complete implementation gate

Before the draft PR is handed over:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run test:coverage
npm run test:e2e:smoke
npm run test:e2e:sync
npm run test:e2e
npm run test:e2e:coverage
```

Record command, result, duration, worker count, retry count and artefact path. Do not report a skipped or unrun gate as passing.

## Definition of done

- [ ] Baseline measurements and authoritative inventory are committed.
- [ ] Ordinary functional E2E does not load/collect coverage.
- [ ] Smoke, Writer Sync, full functional and full coverage commands exist and select the intended tests.
- [ ] Two-worker execution is proven stable with retries zero, or evidence records why one worker remains correct.
- [ ] Existing app-wide floors hold or rise.
- [ ] Writer Sync local coverage is at least 85% on every metric and progresses towards ≥95%; no floor was lowered.
- [ ] Existing package Vitest coverage still includes `packages/*/src/**` and meets its thresholds.
- [ ] B1 and B4–B6 browser regressions are mapped to deterministic tests; B2 remains strongly covered at package/integration level.
- [ ] Passphrase-only cloud convergence has real provider-backed evidence or remains an explicit beta blocker/gap with no fake substitute.
- [ ] Disconnected catch-up is covered through the product's actual supported reconnection path.
- [ ] Production QR ponyfill is exercised under deployed CSP on a non-native decoder path.
- [ ] Fast CI signal and full coverage gate are both required and retain useful artefacts.
- [ ] Retry-passes fail CI after stability validation.
- [ ] Full coverage completes with at least 20% timeout headroom.
- [ ] Measured functional wall time improves by at least 30%, or the achieved result and limiting factor are documented.
- [ ] Sharding is either proven and adopted through E7 or explicitly rejected with measurement.
- [ ] No skipped/focused/deleted/weakened test, new migration, type escape or coverage reduction was introduced.
- [ ] Draft PR title/body conform exactly to the repository template; the human-only attestation remains unticked.

## Handover record

The implementer's handover must include:

- latest blocker-base and implementation SHAs;
- live todo state by E-slice;
- exact files changed;
- dependency decision for `monocart-coverage-reports`;
- before/after timing table;
- smoke/sync/full/coverage results;
- first-pass and retry-pass counts;
- app and Writer Sync coverage summaries/floors;
- unresolved product defects or stop-and-ask questions;
- whether E7 sharding was adopted or rejected and why.
