# Writer Sync E2E coverage and execution runbook

Documentation-only reference for improving Playwright coverage and feedback time on top of `fix/writer-sync-beta-blockers`.

This branch does not implement the changes. The implementation branch should be cut from the latest `fix/writer-sync-beta-blockers` head as `test/writer-sync-e2e-optimisation`, then follow the ordered slices in [`RUNBOOK.md`](./RUNBOOK.md).

## Start here

| File | Purpose |
|---|---|
| [`RUNBOOK.md`](./RUNBOOK.md) | Ordered implementation slices E0–E7, gates, stop conditions and definition of done. |
| [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) | Exact files, proposed configuration structure, pseudocode, tag contract and CI design. |
| [`COVERAGE-MATRIX.md`](./COVERAGE-MATRIX.md) | Existing Writer Sync journeys, beta-blocker mapping, missing journeys and the correct test layer for each invariant. |
| [`BASELINE.md`](./BASELINE.md) | Evidence from the current base plus a template for recording measured time, retries, slow specs and coverage before optimisation. |

## Outcome

The implementation should produce four distinct feedback paths:

| Command | Purpose | Coverage instrumentation |
|---|---|---|
| `npm run test:e2e:smoke` | Very fast app and beta-critical signal. | Off |
| `npm run test:e2e:sync` | Targeted Writer Sync browser journeys. | Off |
| `npm run test:e2e` | Complete functional browser suite. | Off |
| `npm run test:e2e:coverage` | Complete coverage run and ratchets. | On |

The functional commands must not load or collect Monocart coverage. The coverage command must preserve the existing app-wide ratchet and add a Writer Sync local-coverage gate without lowering any committed floor.

## Branch model

```text
develop
  └── feat/writer-sync
        └── fix/writer-sync-beta-blockers
              ├── build/writer-sync-e2e-runbook       reference only
              └── test/writer-sync-e2e-optimisation   implementation
```

If the blocker branch advances, start or rebase the implementation branch onto its latest head before editing. Do not merge product fixes into the reference branch.

## Hard rules

- Do not delete, skip, focus or weaken a test to reduce runtime.
- Do not lower `coverage-baseline.json` or relax `scripts/coverage-ratchet.mjs`.
- Keep real WebRTC for the small number of journeys whose claim is that two browser devices actually pair or transfer data.
- Test protocol permutations, crypto validation, batching, acknowledgement and convergence algorithms at package or integration level when a browser adds no evidence.
- Keep every browser test isolated. Never reuse a paired identity, IndexedDB database or browser context across tests.
- Introduce parallel workers only after proving isolation with retries disabled.
- Treat a retry-pass as a flaky failure during the stabilisation slices; retries are diagnostic evidence, not a substitute for a deterministic wait condition.
- Preserve headless, cross-platform Playwright rules from `AGENTS.md` and `.agents/skills/test-writer-changes/SKILL.md`.
- Product behaviour, help copy and the technical specification remain unchanged unless an E2E gap exposes a real product defect. Fix that defect on the beta-blocker branch or a separately approved product-fix branch.

## Decisions already made

1. Separate normal execution from coverage collection.
2. Tag tests instead of duplicating suites.
3. Begin CI parallelism at two workers after an isolation audit.
4. Add a fast Writer Sync lane while retaining the complete coverage gate.
5. Add local Writer Sync coverage so the global aggregate cannot hide an untested sync feature.
6. Defer cross-runner sharding until workers and reporter merging have been measured and proven.

## References used

- Repository: `AGENTS.md`, `docs/architecture.md`, `docs/technical-specification.md` §4.9, `.agents/skills/plan-writer-change`, `.agents/skills/test-writer-changes`, `.agents/skills/work-on-writer-sync`.
- Protocol: `packages/writer-sync/docs/threat-model.md`, `pairing-protocol.md`, `sync-frame-protocol.md`.
- Test infrastructure: `playwright.config.ts`, `playwright.preview.config.ts`, `e2e/_helpers.ts`, `.github/workflows/e2e.yml`, `.github/workflows/e2e-preview.yml`, `scripts/coverage-ratchet.mjs`, `coverage-baseline.json`.
- External primary references: [Playwright tags](https://playwright.dev/docs/test-annotations#tag-tests), [parallelism](https://playwright.dev/docs/test-parallel), [sharding](https://playwright.dev/docs/test-sharding), and [Monocart coverage](https://github.com/cenfun/monocart-reporter#code-coverage-report).
