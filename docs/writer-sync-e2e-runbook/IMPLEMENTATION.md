# Technical implementation brief

## Goal

Create a fast functional Playwright path, a deterministic Writer Sync subset, parallel-safe CI execution and a local Writer Sync coverage gate while preserving the complete suite and every existing coverage floor.

## Analogue

- Functional/preview configuration split: `playwright.config.ts` and `playwright.preview.config.ts` already separate local and deployed concerns.
- Automatic multi-page coverage: `e2e/_helpers.ts` already instruments the default page, extra pages and second-device contexts.
- Ratcheting: `scripts/coverage-ratchet.mjs` and `coverage-baseline.json` already implement monotonic floors.
- Test selection: use Playwright native tags and `--grep`; do not create duplicated spec trees.

## Proposed files

### Infrastructure

| Path | Change |
|---|---|
| `playwright.local.config.ts` | New typed factory for the shared local web server, Chromium project, retries, workers and functional reporters. |
| `playwright.config.ts` | Reduce to the ordinary functional configuration; no Monocart reporter. |
| `playwright.coverage.config.ts` | New coverage-only configuration that turns on the coverage fixture and writes one raw V8 report. |
| `e2e/_helpers.ts` | Gate Chromium coverage on configuration metadata; dynamically load `addCoverageReport`; continue closing all extra contexts in both modes. |
| `scripts/generate-e2e-coverage.mjs` | Generate app-wide and Writer Sync local reports from the same raw V8 input. |
| `scripts/coverage-ratchet.mjs` | Preserve the `e2e` profile and add a `writerSyncE2E` profile/path. |
| `coverage-baseline.json` | Add `writerSyncE2E` only after every measured metric is at least 85%; never lower `e2e`. |
| `package.json` | Add smoke/sync commands and make coverage use the coverage-only config plus both ratchets. |
| `package-lock.json` | Change only if the approved coverage-report API is declared directly. |
| `.github/workflows/e2e.yml` | Add a fast Writer Sync job; move the full gate to the coverage config; begin at two workers after E3. |
| `.github/workflows/e2e-preview.yml` | Add the focused WebKit/ponyfill check only as the B5 coverage slice. |
| `playwright.preview.config.ts` | Add a separate WebKit project or focused config only for the production decoder fallback. Do not collect coverage here. |

### E2E helpers and specs

| Path | Change |
|---|---|
| `e2e/_pairing.ts` | Own the shared pairing walk and constants. Add typed post-pair helpers only when reused by at least two specs. |
| `e2e/pair-device.spec.ts` | Import the shared pairing primitives instead of retaining a second copy; add native tags. |
| `e2e/pair-sync.spec.ts` | Tag P0; after measurement, consolidate initial and live sync into one stepped real-pair journey if it materially saves time. |
| `e2e/pair-sync-content.spec.ts` | Tag P0; consider one pairing with separate note/document `test.step`s only after failure isolation is preserved. |
| `e2e/pair-sync-reconcile.spec.ts` | Tag sync/recovery; retain user-visible convergence, move pure acknowledgement/compaction permutations to integration tests. |
| `e2e/pair-again.spec.ts` | Tag P0 smoke/recovery; keep two real exchanges. |
| `e2e/pair-remove-disconnects.spec.ts` | Tag P0 security/smoke; strengthen the post-removal negative assertion. |
| `e2e/pair-expiry.spec.ts` | Tag P0 security; do not combine the two trust-state cases. |
| `e2e/pair-device-drop.spec.ts` | Tag P1 recovery. |
| `e2e/peer-link-state.spec.ts` | Tag P1/a11y; retain the link-state seam instead of real pairing. |
| `e2e/attachments-pair-sync.spec.ts` | Tag P0; extend to repeated same-direction transfer and link survival. |
| `e2e/cloud-sync.spec.ts` | Tag cloud/sync; tag only the minimum key set-up/unlock path as smoke. |
| `e2e/cloud-devices.spec.ts` | Tag cloud/recovery/a11y. |
| `e2e/cloud-recovery-code.spec.ts` | Tag cloud/recovery/security. |
| `e2e/cloud-operation-journal.spec.ts` | Tag cloud/journal/security. |
| `e2e/cloud-crdt-recovery.spec.ts` | Tag cloud/recovery. |
| `e2e/pair-reconnect-catch-up.spec.ts` | New P0 real-session journey for work created while disconnected. |
| `e2e/cloud-cross-device-sync.spec.ts` | New P0 journey only when a deterministic two-device cloud harness exists. |
| `e2e/attachments-pair-sync-recovery.spec.ts` | Optional new file if extending the existing attachment spec would make its purpose unclear. |
| `e2e/preview-qr-ponyfill.spec.ts` | Focused deployed-preview decoder fallback, WebKit or forced ponyfill. |

### Documentation affected by the implementation

| Path | Change |
|---|---|
| `AGENTS.md` | Update E2E commands and explain that ordinary functional runs do not collect coverage. Preserve all floors and headless rules. |
| `.agents/skills/test-writer-changes/SKILL.md` | Add the targeted smoke/sync commands only if the repository wants skills to expose them. Do not duplicate policy. |
| `docs/architecture.md` §10 | Add the new reconnection/cloud/attachment specs to the test map. |
| `docs/technical-specification.md` §4.9.2 | Update only when a new spec proves a product behaviour not currently described, such as disconnected catch-up. |
| `src/help/content/en/*.md` | No change for test-infrastructure work. Update only when a product defect fix changes what the user experiences. |

## Configuration design

### 1. Shared local config factory

Use a function rather than copying the 100-line configuration into two files.

```ts
// playwright.local.config.ts
import type { PlaywrightTestConfig, ReporterDescription } from '@playwright/test';
import { devices } from '@playwright/test';

interface LocalConfigOptions {
  collectCoverage: boolean;
}

const functionalReporters = (): ReporterDescription[] => [
  process.env.CI ? ['github'] : ['list'],
  ['html', { open: 'never' }],
];

export const createLocalConfig = ({
  collectCoverage,
}: LocalConfigOptions): PlaywrightTestConfig => ({
  testDir: './e2e',
  testIgnore: ['**/preview-*.spec.ts'],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  metadata: { collectCoverage },
  reporter: functionalReporters(),
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
          ],
        },
      },
    },
  ],
  webServer: {
    command: 'npm run build:e2e && npm run preview:e2e',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

Do not set two workers until E3 has passed. During E1/E2, keep the current `workers: process.env.CI ? 1 : undefined` value so configuration separation and parallelisation have independent evidence.

### 2. Functional config

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { createLocalConfig } from './playwright.local.config';

export default defineConfig(createLocalConfig({ collectCoverage: false }));
```

The resulting `npm run test:e2e` must neither load Monocart as a reporter nor start Chromium coverage.

### 3. Coverage config

```ts
// playwright.coverage.config.ts
import { defineConfig } from '@playwright/test';
import { createLocalConfig } from './playwright.local.config';

const config = createLocalConfig({ collectCoverage: true });

export default defineConfig({
  ...config,
  reporter: [
    ...(config.reporter ?? []),
    [
      'monocart-reporter',
      {
        name: 'E2E coverage collection',
        outputFile: './e2e-coverage/index.html',
        coverage: {
          entryFilter: (entry: { url?: string }) =>
            Boolean(
              entry.url?.includes('localhost') &&
                (entry.url.includes('/assets/') || entry.url.includes('/src/')),
            ),
          sourceFilter: (path: string) =>
            !path.includes('node_modules/') &&
            (/(^|\/)src\//.test(path) || /(^|\/)packages\//.test(path)),
          outputDir: './e2e-coverage',
          reports: [['raw', { outputDir: 'raw' }]],
        },
      },
    ],
  ],
});
```

Keep all exclusions in the report-generation profiles rather than filtering data out before the raw report exists. This lets one instrumented browser run generate more than one view without rebuilding or re-running the suite.

Before implementation, confirm `ReporterDescription` composition type-checks with Playwright 1.61. If the reporter tuple union becomes awkward, export a typed reporter factory from the shared config instead of casting to `any` or `unknown`.

## Coverage fixture

The fixture must instrument only coverage runs while always cleaning up second-device contexts.

```ts
const isCoverageRun = (): boolean =>
  base.info().config.metadata.collectCoverage === true;

export const openCoveredPage = async (
  context: BrowserContext,
  browserName: string,
): Promise<Page> => {
  const page = await context.newPage();
  if (browserName === 'chromium' && isCoverageRun()) {
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    coveredPages.push(page);
  }
  return page;
};

// In autoCoverage teardown:
if (enabled) {
  const { addCoverageReport } = await import('monocart-reporter');
  await addCoverageReport(await page.coverage.stopJSCoverage(), test.info());
}

for (const extra of coveredPages.splice(0)) {
  if (!extra.isClosed()) {
    const { addCoverageReport } = await import('monocart-reporter');
    await addCoverageReport(await extra.coverage.stopJSCoverage(), test.info());
  }
}

for (const context of coveredContexts.splice(0)) await context.close();
```

Refactor the repeated dynamic import into a small typed helper. Do not introduce module-level mutable state beyond the existing per-worker page/context registries. Confirm teardown drains both arrays even when the test fails.

Executable assertions for E1:

```bash
npm run test:e2e -- e2e/smoke.spec.ts
test ! -d e2e-coverage
npm run test:e2e:coverage -- e2e/smoke.spec.ts
test -d e2e-coverage/raw
```

Use a temporary output directory or clear only the exact `e2e-coverage` test artefact before the first assertion. Never remove a broad workspace path.

## Generate two reports from one raw collection

The recommended implementation uses the public `CoverageReport` API from `monocart-coverage-reports` to process the same raw directory twice.

This is a new direct dev-dependency declaration even if npm currently hoists it transitively through `monocart-reporter`. The repository planning rules require an explicit user decision before adding a dependency. Stop at E4 and obtain that approval. If approval is withheld, use two coverage configurations/runs as a slower fallback; do not import an undeclared transitive dependency.

```js
// scripts/generate-e2e-coverage.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { CoverageReport } from 'monocart-coverage-reports';

const METRICS = ['lines', 'statements', 'functions', 'branches'];

const writeSummary = async (outputDir, reportData) => {
  const summary = {};
  for (const metric of METRICS) {
    const pct = reportData.summary?.[metric]?.pct;
    if (typeof pct === 'number') summary[metric] = { pct };
  }
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    `${outputDir}/coverage-summary.json`,
    `${JSON.stringify(summary, null, 2)}\n`,
  );
};

const common = {
  inputDir: './e2e-coverage/raw',
  reports: [['v8'], ['console-summary'], ['lcov']],
};

const profiles = [
  {
    outputDir: './e2e-coverage/app',
    sourceFilter: appSourceFilter,
  },
  {
    outputDir: './e2e-coverage/writer-sync',
    sourceFilter: writerSyncSourceFilter,
  },
];

for (const profile of profiles) {
  const report = new CoverageReport({
    ...common,
    ...profile,
    onEnd: (data) => writeSummary(profile.outputDir, data),
  });
  await report.generate();
}
```

Extract the source filters into named pure functions and unit-test their path mappings with `it.each`. Preserve every current app exclusion exactly for the `e2e` profile.

Suggested Writer Sync browser profile:

```ts
const writerSyncSourceFilter = (path: string): boolean => {
  if (COMMON_EXCLUSIONS.some((excluded) => excluded(path))) return false;
  return (
    path.includes('src/lib/writerSyncIntegration/') ||
    path.includes('src/components/pairing/') ||
    path.endsWith('src/components/settings/tabs/DeviceSyncTab.tsx') ||
    path.endsWith('src/components/settings/tabs/CloudSyncTab.tsx') ||
    path.includes('src/components/settings/tabs/cloud/')
  );
};
```

Report `packages/writer-sync` and `packages/writer-qr` browser reachability separately at first, without using that percentage to replace the existing Vitest package gate. The blocker branch already includes package sources in Vitest coverage. Browser coverage answers “which engine paths did these journeys traverse?”, while Vitest remains responsible for pure engine branches.

## Ratchet extension

Preserve the existing `e2e` key and floor values. Add a second summary path:

```js
const SUMMARY_PATHS = {
  e2e: './e2e-coverage/app/coverage-summary.json',
  writerSyncE2E: './e2e-coverage/writer-sync/coverage-summary.json',
};
```

Seed `writerSyncE2E` only after E5 has brought every metric to at least 85%. Set each floor to the measured integer floor without a downward margin below 85, then let the existing monotonic raise logic move it towards 95 and 100.

Do not overwrite the app-wide summary location until a parity run proves the new app profile returns the same percentages as the old `sourceFilter`. Accept only harmless rounding differences that are explained and tested.

## Commands

Proposed scripts:

```json
{
  "test:e2e": "playwright test --config=playwright.config.ts",
  "test:e2e:smoke": "playwright test --config=playwright.config.ts --grep @smoke --retries=0",
  "test:e2e:sync": "playwright test --config=playwright.config.ts --grep @sync --retries=0",
  "test:e2e:coverage:collect": "playwright test --config=playwright.coverage.config.ts",
  "test:e2e:coverage:reports": "node scripts/generate-e2e-coverage.mjs",
  "test:e2e:coverage": "npm run test:e2e:coverage:collect && npm run test:e2e:coverage:reports && node scripts/coverage-ratchet.mjs e2e && node scripts/coverage-ratchet.mjs writerSyncE2E"
}
```

Keep `test:e2e:ui` for humans only. Agent and CI instructions remain headless.

## Tags

Use native Playwright details so tags are visible to `--grep` and reporters:

```ts
test(
  'a paired device receives writing the other one already had',
  { tag: ['@sync', '@p2p', '@smoke'] },
  async ({ page, browser, browserName }) => {
    // existing test
  },
);
```

Tag definitions:

| Tag | Meaning |
|---|---|
| `@smoke` | Smallest immediate beta confidence set; target ≤5 minutes median. |
| `@sync` | Any cross-device Writer Sync browser journey. |
| `@p2p` | WebRTC/pairing provider path. |
| `@cloud` | Durable cloud provider/key lifecycle path. |
| `@recovery` | Disconnect, revoke, expiry, mismatch, restore, replay or catch-up recovery. |
| `@security` | Negative assertion at a trust/input boundary. |
| `@attachment` | Attachment/chunk transfer. |
| `@journal` | Operation journal/inbox/tombstone materialisation. |
| `@a11y` | Accessibility assertion beyond ordinary semantic locators. |

Do not add `@slow`; durations belong in measured reports, not a permanent excuse to serialise a test.

## Parallel-safety audit

Before setting CI to two workers, inspect every item below and record its result in `BASELINE.md`.

| Risk | Required evidence |
|---|---|
| IndexedDB/localStorage collision | Default Playwright context is per test; each extra device is a new context; no persistent context or shared user-data directory. |
| Module-level mutable state | `coveredPages`/`coveredContexts` are per worker and drained in fixture teardown; no spec depends on another test's array entry. |
| Fixed entity/device ids | IDs are scoped to each browser context/database. Any external account/realm id is unique per worker. |
| Shared server state | Local Vite preview is read-only application hosting. Cloud harness state, if introduced, is partitioned by worker index and cleaned safely. |
| Fixed ports | Playwright owns one web server for the run; no test starts another process on 4173. |
| Clock mutation | Fake clocks are restored within the test/context and never alter the host clock. |
| Route/reseed semantics | Every test seeds or establishes its own state; no file relies on test declaration order. |
| Extra context cleanup | Contexts close on pass, assertion failure and thrown helper error. Coverage teardown stops only instrumentation that actually started. |
| Coverage output | Raw coverage writes use reporter-supported worker merging, not shared ad-hoc filenames from test workers. |

Validation sequence:

```bash
# Existing serial control.
npx playwright test --workers=1 --retries=0 --repeat-each=3

# Candidate setting.
npx playwright test --workers=2 --retries=0 --repeat-each=3

# Randomisation by sharding/file selection is optional; repeat the sync set directly.
npm run test:e2e:sync -- --workers=2 --repeat-each=3
```

Do not move to three or four workers unless two workers are stable and measurement shows CPU remains under-used. More workers can slow coverage processing and increase WebRTC/Chromium contention.

## Reduce repeated expensive set-up

Follow these rules in E5:

1. Keep one complete real pairing in `pair-device.spec.ts` for protocol/UI assembly.
2. Keep real pairing for sync, revocation, expiry, reconnect and attachment journeys.
3. Use `peer-link-state.spec.ts`'s seam for UI-only connected/dropped/idle rendering.
4. Move pure cursor, batch, signature, replay, acknowledgement and frame-limit permutations to package/integration tests.
5. Consolidate two tests only when they share the same real pairing and can remain independently named with `test.step`.

Example consolidation candidate:

```ts
test(
  'paired devices catch up and exchange later writing',
  { tag: ['@sync', '@p2p', '@smoke'] },
  async ({ page, browser, browserName }) => {
    const second = await openCoveredContext(browser, browserName);

    await test.step('catch up writing that existed before pairing', async () => {
      // current first pair-sync assertion
    });

    await test.step('deliver writing created after pairing', async () => {
      // current second pair-sync assertion, reusing the live pair
    });
  },
);
```

Do not combine expiry cases, adversarial cases or different provider paths merely to reduce a number in the report.

## CI design

Run the fast signal and full gate independently so the first failure arrives early.

```yaml
jobs:
  unit:
    # existing lint, typecheck, Vitest coverage

  e2e-sync:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      # existing checkout/setup/cache/install pattern
      - name: Writer Sync smoke
        run: npm run test:e2e:smoke
      - if: failure()
        # upload Playwright report/trace

  e2e-coverage:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      # existing checkout/setup/cache/install pattern
      - name: E2E tests and coverage ratchets
        run: npm run test:e2e:coverage
      - if: always()
        # upload e2e-coverage/
```

The smoke lane does not replace the full suite. Keep the jobs parallel unless measurement shows runner demand is a material project constraint.

After stabilisation, reduce coverage-job retries from two to one and set `failOnFlakyTests: true` on CI. Do this only after five smoke runs and three full sync runs pass with retries disabled. The fast lane already uses retries zero.

## Sharding decision gate

Do not shard in E1–E6. Consider E7 only when:

- two-worker coverage remains too close to the 20-minute timeout;
- the build/install share is small enough that another runner reduces wall time;
- Monocart raw coverage has been proven to merge across shards;
- Playwright reports use blob output and `merge-reports` or Monocart's supported merge path;
- no cloud test shares an account or realm between shards.

If adopted, begin with two shards, retain two workers per shard only if runner CPU allows it, and compare total compute as well as wall time. Monocart 2.12 supports raw coverage merge, but the implementation must prove the repository's source maps and summary parity before making sharding required.

## Persistence, accessibility and security impact

- DB/schema: none. E2E seams may insert typed rows into existing stores; no new Dexie version, table, index or migration.
- Accessibility: no UI change. Keep a11y tests tagged and ensure the fast lane does not become the only accessibility gate.
- Security: no production trust-boundary change. The suite must retain negative tests for removed/expired/untrusted peers. Any E2E-only seam must be impossible in production builds and covered by a build-gate test.
- Dependencies: declaring `monocart-coverage-reports` directly is a hard stop requiring approval. No other dependency is planned.

## Verification

Run after each slice, narrowest first:

```bash
npx playwright test --list
npm run test:e2e:smoke
npm run test:e2e:sync
npm run lint
npm run typecheck
npm run test:run
npm run test:e2e
npm run test:e2e:coverage
```

For configuration and script edits, add focused unit tests for pure filter/summary functions and run targeted ESLint on each changed TypeScript file. Before the PR settles, run all gates headless and record actual duration, first-pass failures, retry-passes and both coverage summaries.
