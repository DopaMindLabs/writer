# PR 170 cloud-sync remediation runbook

Status: implementation plan, not yet implemented
Source branch: `feat/collaborative-editing`
Source commit: `405451e5360d3f6574b519f51966ecff9f431183`
Pull request: [DopaMindLabs/writer#170](https://github.com/DopaMindLabs/writer/pull/170)
Review: [11 inline findings](https://github.com/DopaMindLabs/writer/pull/170#pullrequestreview-4718680327) and [PR-template findings](https://github.com/DopaMindLabs/writer/pull/170#issuecomment-4998135292)

## Goal

Make the encrypted cloud-sync beta safe and deterministic across account changes,
key recovery, reset, ciphertext reads, CRDT reconciliation, attachments, live-device
verification, preview deployments, and hash routing. Preserve the repository's unit
and end-to-end coverage floors without lowering `coverage-baseline.json`.

## Approval and stopping rules

This programme crosses three canonical public boundaries: `cloudClient.ts`,
`docRepository.ts`, and `collab/types.ts`. `docs/agent-playbooks.md` says to stop and
ask when a change crosses more than two boundaries. Do not implement the whole plan
as one unreviewed change. Treat each packet below as a separately reviewed unit, or
obtain explicit maintainer approval to execute the programme end to end.

Stop and ask if any packet:

- needs a new dependency;
- needs a new table, index, `STORES` entry, or Dexie version;
- cannot reach 95% local E2E coverage, or would fall below the 85% hard floor;
- requires a suppression, type escape hatch, relaxed threshold, or unbounded wait;
- discovers another public boundary or materially different product behaviour;
- needs inbox access, destructive `--purge`, or production data access.

Do not begin implementation until this plan has been reviewed and approved.

## Required reading

Read these in order before editing code. `AGENTS.md` is canonical and wins any
conflict.

1. `AGENTS.md` and `CODING_STANDARDS.md`.
2. `docs/architecture.md`, especially sections 1, 4, 6, 8, 9, and 10.
3. `docs/technical-specification.md`, especially sections 3, 4.9.1, 4.11, and 7.
4. `docs/cloud-sync-beta.md`, especially sections 3 through 6 and 9.
5. `docs/design-system.md`, including the complete component catalogue.
6. `ACCESSIBILITY.md` and `docs/agent-playbooks.md`.
7. The plan, implementation, audit, testing, UI, persistence, cloud-sync,
   collaboration, and cloud-debugging skills under `.agents/skills/`.
8. `src/help/content/en/cloud-sync.md` and `working-in-multiple-tabs.md`.
9. The current `.github/PULL_REQUEST_TEMPLATE.md`.

## Non-negotiable implementation rules

- This is greenfield. Do not add legacy decoders, migrations, fallback branches, or
  old-row fixtures.
- Seed one live todo list from this runbook. Keep exactly one item in progress and
  update it as soon as each result is verified.
- For every behavioural packet: write the failing test, confirm the intended red
  failure, implement the smallest fix, then refactor while green.
- Refactor already non-compliant files in separate behaviour-neutral `refactor:`
  commits before changing behaviour.
- Keep complexity <=12, nesting <=4, functions <=60 lines, and parameters <=3.
- Do not introduce module-level mutable state, floating promises, `any`, suppressions,
  hard-coded waits, or unvalidated nullable values.
- UI code accesses cloud behaviour through `cloudClient.ts` only.
- `docRepository.ts` remains the only write path for `docs.body`.
- `docUpdates` remains local-only; CRDT seeding runs after the document transaction
  commits; collaboration tests use real Dexie through `CollabStore`.
- Use British English in UI copy, Help, comments, and documentation.
- Persistent failure UI uses `InlineBanner`; error notices use `role="alert"`.

## Functional references

### Canonical boundaries

| Boundary | Responsibility | Callers affected |
|---|---|---|
| `src/lib/cloud/cloudClient.ts` | UI-facing cloud actions, observables, and boot facade | `App.tsx`, route errors, cloud settings, `useDocCrdtReady` |
| `src/lib/docs/docRepository.ts` | Document mutations and CRDT seed coordination | autosave, imports, restores, seed data, cloud reconciliation |
| `src/lib/collab/types.ts` | `CollabStore` contract | `DexieCollabStore`, Yjs provider tests, cloud reconciliation |
| `src/editor/EditorFacade.tsx` | Public editor component contract | `WriteSurface.tsx`; no change is planned |

### Cloud boot call chain

```text
App
  -> useAppBoot
    -> cloudClient.hydrateCloudDevice
    -> cloudClient.startCloudSession
      -> load device key
      -> start sibling-tab key channel
      -> start document reconciler
      -> start escrow/account reconciler
      -> start keyless write lock
      -> start device registrar
    -> apply development-only URL parameters
```

Key/account validation and the write lock must be armed before any application
content write can enter the cloud mutation queue.

### Editor mount and save call chain

```text
WriteSurface
  -> useDocCrdtReady
    -> cloudClient.reconcileDocForMount
      -> CollabStore.loadAll
      -> docRepository.readBodyBaseline
      -> updateDocBody or acceptPulledDocBody
  -> EditorFacade.Editor, only when ready
    -> WriteSurface.handleChange
      -> docRepository.updateDocBody
        -> docs.body + local body baseline in one transaction
```

The editor must never mount on an unreconciled Yjs log. No decision may compare
wall clocks from different devices.

### Key and account call chain

```text
Passphrase setup
  -> cloudClient.createCloudEncryption
    -> setup.createCloudEncryption
      -> save pending escrow with account binding
      -> save device ring with the same binding
      -> seal existing rows

Dexie Cloud currentUser change
  -> startEscrowReconciler
    -> synchronously guard account binding
    -> wait for initial pull completion
    -> reconcileEscrow
      -> publish, match, mismatch, or keyless
```

Key material created for account A must never be usable or publishable while signed
into account B.

### Destructive reset call chain

```text
RouteErrorScreen
  -> CloudKeyErrorScreen confirmation
    -> cloudClient.resetCloudDevice
      -> stop or sign out the cloud session
      -> forget ring and pending escrow
      -> clear mismatch and keyless locks
      -> resetAndReseed
      -> hard reload on success
```

Reset is awaited, its seed writes cannot be blocked by a stale lock, and failure
remains visible with a working retry action.

## Analogues

- Persistent cloud retry UI: `CloudReconcileStatusRow.tsx` and its test/story.
- Keyless notice: `CloudKeylessPendingBanner.tsx` and its test/story.
- Guarded destructive action: `CloudKeyErrorScreen.tsx` with `ConfirmDialog`.
- Document write boundary: `docRepository.ts` and `docRepository.test.ts`.
- Real-Dexie collaboration persistence: `DexieCollabStore.ts` and its test.
- Headless cloud journeys: `e2e/cloud-sync.spec.ts` and
  `e2e/cloud-crdt-recovery.spec.ts`.
- Pinned GitHub Actions: `.github/workflows/e2e-preview.yml`.

## Runbook todo seed

1. Reconfirm source SHA, clean worktree, approved packet, and stop conditions.
2. Complete packet 0 compliance refactors and verify no behaviour changed.
3. Complete packet 1 account-bound key lifecycle tests and implementation.
4. Complete packet 2 reset and recovery tests and implementation.
5. Complete packet 3 ciphertext-read and binary-codec tests and implementation.
6. Complete packet 4 body-provenance tests and implementation.
7. Complete packet 5 editor-gate tests, UI, stories, and accessibility coverage.
8. Complete packet 6 live harness state machine and deterministic waits.
9. Complete packet 7 preview-secret and whitelist hardening.
10. Complete packet 8 hash-route preservation.
11. Update Help, specification, architecture, and cloud design note.
12. Run targeted lint and tests for every edited file.
13. Run all repository gates and record exact coverage percentages.
14. Perform approved manual/live checks and record what was not run.
15. Repair the PR body from the current template and verify Draft state.

## Packet 0: compliance refactors

Purpose: make required files comply with `AGENTS.md` before changing behaviour.

1. `src/App.tsx`
   - Extract `RootLayout` to `src/components/chrome/RootLayout.tsx` with test/story.
   - Extract `useAppBoot` to `src/hooks/useAppBoot.ts` with a `.test.ts` test.
   - Put cloud-session orchestration behind `cloudClient.ts`; remove direct UI imports
     of internal cloud modules.
   - Move `applyDevBootParams`, `applyCloudDeviceParam`, and `stripParam` to a
     development-boot utility.
2. `src/components/surfaces/WriteSurface.tsx`
   - Extract `LockBanner` with test/story.
   - Extract the mount-only revision-baseline effect so the existing hooks suppression
     can be removed without changing when the baseline is captured.
3. `src/lib/cloud/crypto/keyStore.ts`
   - Replace module-scope `let keystore`, `cached`, `deviceKeyRevision`, and mutable
     listeners with explicitly owned keystore service state.
   - Keep wrapper behaviour stable in the refactor commit.
4. `src/lib/cloud/reconcile.ts`
   - Move `lastReconciledBody`, `runCounter`, and `requestActive` into a reconciler
     runtime owned by the cloud-session lifecycle.
   - Preserve single-flight, queued rerun, sign-out reset, retry, and status behaviour.

Keep all existing tests green without changing behavioural assertions. Inspect each
refactor diff and confirm it contains structural moves only.

Required commits:

1. `refactor(app): split root layout and boot orchestration`
2. `refactor(editor): split write surface helpers`
3. `refactor(cloud): encapsulate device keystore state`
4. `refactor(cloud): scope reconciliation runtime to the session`

## Packet 1: bind device keys to an account

Finding: `src/lib/cloud/escrowReconcile.ts:85`.

### Contract

Use explicit greenfield records in `keyStore.ts`:

```ts
interface DeviceKeyRingRecord {
  accountId: string | null;
  ring: CloudKeyRing;
}

interface PendingEscrowRecord {
  accountId: string | null;
  escrow: EscrowRecord;
}
```

Use option-object writes such as `saveDeviceKeyRing({ accountId, ring })` and
`savePendingEscrow({ accountId, escrow })`. Update every caller and test fixture
explicitly. Do not use defaults that silently create unbound rows.

`accountId: null` means setup occurred before sign-in and has not been claimed. A
string means the material is usable only for that `UserLogin.userId`.

### Failing tests first

1. Signed-out setup stores ring and pending escrow with `accountId: null`.
2. First successful account A reconciliation binds both records to A.
3. Setup while signed into an empty account stores A immediately.
4. A setup -> publish -> sign out -> empty B account locks synchronously, forgets
   A's material, and rejects a B content write.
5. Pending escrow bound to A cannot publish while current user is B.
6. Ring + no server escrow + no pending escrow becomes explicitly keyless, not
   published.
7. Matching server fingerprint binds an unbound ring to the current account.
8. Missing/malformed `accountId` rejects; do not repair it.

### Implementation

1. Extend non-indexed keystore row values; keep `rings: 'id'` and
   `pendingEscrows: 'id'` unchanged.
2. Expose the cached binding through the synchronous key provider.
3. Save the current account in setup, unlock, recovery, and adopt flows when signed
   in; use null only for valid pre-sign-in setup.
4. Pass `UserLogin.userId` from `startEscrowReconciler` to `reconcileEscrow`.
5. On identity change, compare cached binding synchronously. If a non-null binding
   differs, engage the keyless write lock before async cleanup, then forget the ring
   and pending escrow.
6. Claim an unbound ring only after publication succeeds or the server fingerprint
   matches.
7. Add `keyless` to `EscrowReconcileResult`. When
   `publishPendingEscrow() === 'none'`, forget the unusable ring and leave the
   keyless lock engaged.
8. Export UI-required behaviour through `cloudClient.ts` only.

Acceptance: account A material never encrypts or publishes account B content, and B
cannot write until B is set up or unlocked.

Commit: `fix(cloud): bind device keys to their cloud account`.

## Packet 2: make reset and recovery fail safely

Findings: `RouteErrorScreen.tsx:49` and `setup.ts:203`.

### Failing tests first

1. A valid-checksum recovery code from another master is rejected when escrow exists
   but the account contains no sealed rows.
2. The matching code succeeds on the same empty account.
3. Reset stops/signs out the cloud session, forgets local key material, clears both
   locks, and reseeds successfully.
4. Route reload occurs only after awaited reset success.
5. Rejected reset keeps the recovery screen open, announces a persistent error, and
   permits retry.
6. Confirm, cancel, and retry are keyboard operable and accessibly named.

### Implementation

1. In `recoverCloudEncryption`, compare the derived ring fingerprint with the escrow
   fingerprint using `fingerprintsEqual` before saving. Keep the sealed-row decrypt
   as a second integrity check.
2. Add `resetCloudDevice` behind `cloudClient.ts`. It stops/signs out cloud state,
   forgets ring/pending escrow, clears mismatch/keyless locks, awaits
   `resetAndReseed`, and propagates errors.
3. Do not add a general middleware bypass for reset. Reach a legitimate signed-out
   state before local seed writes.
4. Change `CloudKeyErrorScreenProps.onReset` to `() => Promise<void>`.
5. Track pending/error state; disable duplicate confirmation; show
   `InlineBanner kind="error" role="alert"` with translated `Try again` copy.
6. Make `RouteErrorScreen` use cloud classification/reset from `cloudClient.ts` only.

Acceptance: reset cannot be blocked by stale cloud locks; a failure is visible and
retryable; a wrong recovery code is rejected before a key is saved.

Commit: `fix(cloud): make device reset and recovery fail safely`.

## Packet 3: hide ciphertext and bound binary growth

Findings: `middleware.ts:218` and `envelope.ts:86`.

### Failing tests first

Add signed-out, no-ring middleware cases for `get`, `bulkGet`, and value queries.
Sealed rows must be hidden, plaintext rows must pass, batch positions must be
preserved, and internal blob transactions must still receive raw sealed rows.

Replace raw-storage helpers that null the provider. Inspect DBCore/native IndexedDB
instead, so storage tests do not disable the security behaviour they test.

Add codec tests for nested `Uint8Array`, Blob MIME/byte equality, a 5 MiB Blob, an
encrypted envelope below twice the raw byte count, and malformed base64 tags. Add no
test or decoder for the removed number-array representation.

### Implementation

1. If `provider.current()` is null, always hide sealed values. Remove the dependency
   on `lockReason()` for this decision.
2. Preserve key-only queries and the internal blob-transaction bypass.
3. Extract `binaryJsonCodec.ts` from the envelope service.
4. Encode binary values as explicit base64 tags, for example
   `{ __u8b64: string }` and `{ __blob: { type, base64 } }`.
5. Use chunked conversion so 5 MiB cannot overflow the argument stack.
6. Validate tag fields before allocation; keep outer `iv`/`data` as strings and keep
   `largeStringThreshold: Infinity`.

Acceptance: no-ring reads never expose an envelope, and maximum-size attachments
round-trip byte-for-byte without number-array expansion.

Commits:

1. `fix(cloud): hide sealed rows whenever no key is loaded`
2. `fix(cloud): encode encrypted binary values as base64`

## Packet 4: replace device clocks with local body provenance

Finding: `reconcile.ts:269`.

### Contract

Store the exact `docs.body` last written locally in the existing local-only `meta`
table under `docBodyBaselineKey(docId)`. Dexie Cloud changes `docs.body` directly and
therefore does not update this local marker.

Suggested `docBodyBaseline.ts` API:

```ts
export const docBodyBaselineKey = (docId: string): string =>
  `doc-body-baseline:${docId}`;
export const readDocBodyBaseline = (docId: string): Promise<string | null>;
export const writeDocBodyBaseline = (docId: string, body: string): Promise<void>;
export const deleteDocBodyBaseline = (docId: string): Promise<void>;
```

### Decision table

| CRDT log | Snapshot vs row | Baseline vs row | Result |
|---|---|---|---|
| empty | different | any | seed from row; record row; no revision |
| non-empty | equal | any | converged; record row |
| non-empty | different | equal | unsaved CRDT wins; call `updateDocBody` |
| non-empty | different | different | pulled row wins; save CRDT as `pre-sync`; apply row |
| non-empty | different | missing | reject invariant; no fallback |

### Failing tests first

1. Create, update, bulk create, and restore write body/baseline atomically.
2. Failure injection proves neither advances alone when a transaction rejects.
3. Document/space delete and archive restore remove baseline keys.
4. Remote `updatedAt` far ahead and far behind give the same result for the same
   operation sequence.
5. Unsaved CRDT wins only when the row equals the last local baseline.
6. Pulled body wins when it differs; local snapshot becomes `pre-sync` first.
7. Empty log adopts the row without a spurious revision.
8. Missing baseline with divergent non-empty log fails explicitly.
9. Use real Dexie and real `CollabStore`.

### Implementation

1. Add the baseline helper and test.
2. Make `createDoc`, `createDocs`, `restoreDocs`, and `updateDocBody` write baseline in
   the same transaction as `docs`.
3. Add `db.meta` to `IMPORT_TABLES` and seed transaction tables; it is already in
   `RESTORE_TABLES`.
4. Delete baseline keys in document/space cascade and archive restore cleanup.
5. Add a repository operation such as `acceptPulledDocBody` to record a successfully
   accepted pull without pretending it was a local body mutation.
6. Record accepted baseline only after CRDT restore/reseed succeeds.
7. Remove `lastUpdateAt` from `CollabStore`, `DexieCollabStore`, and fixtures.
8. Remove `updatedAt` from `reconcileDocForMount` and every caller.
9. Preserve seed-after-commit.

Acceptance: unrelated device clocks cannot change the winner; operation provenance
decides; the losing body remains recoverable.

Commit: `fix(collab): reconcile pulled bodies using local provenance`.

## Packet 5: keep the editor gate closed after failure

Finding: `useDocCrdtReady.ts:45`.

### Contract

```ts
export type DocCrdtReadiness =
  | { state: 'pending' }
  | { state: 'ready' }
  | { state: 'failed'; error: Error; retry: () => void };
```

### Failing tests first

1. Rejection enters `failed`, never `ready`.
2. Retry follows `failed -> pending -> ready` only after resolution.
3. Changing document invalidates the previous request.
4. Resolution after unmount does not update state.
5. `Editor` is absent while pending or failed.
6. Failure is announced with an accessible keyboard-operable retry action.
7. Successful retry removes the banner and mounts `Editor` once.
8. E2E creates deterministic invalid local CRDT state, verifies the closed gate,
   repairs state, retries, and verifies editor mount.

### Implementation

1. Export pre-mount reconciliation through `cloudClient.ts`; the hook must not import
   internal reconcile code.
2. Remove the `.finally(setReady)` path. Set ready only in the resolved active branch.
3. Convert unknown errors with the repository helper without rendering sensitive
   content.
4. Add `CrdtMountErrorBanner.tsx` with test/story, `InlineBanner kind="error"`, and
   `role="alert"`.
5. Add British-English strings to `screens.json`.
6. Render `Editor` only when `state === 'ready'`.
7. Do not use timeout, best-effort mount, reload, or blank-editor fallback.

Acceptance: a failed reconciliation cannot mount an editor over unverified state;
retry opens the editor only after success.

Commit: `fix(editor): block mount until CRDT reconciliation succeeds`.

## Packet 6: exercise the real signed-in key path in the harness

Finding: `scripts/cloud-device-harness.mjs:153`.

After sign-in, classify and await one terminal state:

| Locator/state | Action | Success |
|---|---|---|
| `cloud-forget` | already keyed | continue |
| `cloud-keyless-locked` | click its Unlock action; enter passphrase | `cloud-forget` |
| `cloud-keyless-nokey` | complete setup and recovery acknowledgement | `cloud-forget` |
| fetch/offline/limit/revoked error | throw descriptive error | stop |

Implementation steps:

1. Extract/test a pure key-state classifier.
2. Remove the signed-out `cloud-unlock` lookup.
3. Drive setup completely when no escrow exists.
4. Poll each page database until its own `cloudDevices` row exists.
5. Replace the 60-second sleep with bounded condition sampling for registration,
   settled sync, and expected content.
6. Add a maximum-size attachment probe; compare hash, bytes, and MIME on device B;
   clean up probe rows.
7. Keep the harness headless. Ask the user for OTPs. Never read an inbox.
8. Never run `--purge` without explicit approval immediately before execution.

Record target URL, time, client identities, key states, registration/sync latency,
attachment hash, and cleanup. Do not claim live verification without the OTP run.

Commit: `test(cloud): exercise signed-in key acquisition in the device harness`.

## Packet 7: scope preview secrets and harden whitelisting

Findings: `playwright.preview.config.ts:41` and
`.github/workflows/whitelist-dexie-cloud.yml:27`.

### Origin validator

Add `scripts/preview-origin.mjs`. `validateWriterPreviewOrigin(input)` must parse with
`new URL`, require HTTPS, reject credentials/ports/paths/query/fragment, allow only
the Writer production host and exact Writer Vercel project preview pattern, and
return `url.origin`. Never allow arbitrary `*.vercel.app` hosts or log secrets.

If the exact Vercel project slug/owner cannot be confirmed from deployment metadata,
stop and ask before writing the allow-list.

Tests cover production, valid preview, HTTP, credentials, deceptive suffixes,
foreign projects, ports, paths, queries, fragments, whitespace, and malformed URLs.

### Playwright

1. Remove `extraHTTPHeaders` from preview config.
2. Add `playwright.preview.setup.ts` as global setup.
3. Validate `E2E_BASE_URL` before requests.
4. Send Vercel bypass headers once through an API request context to that origin and
   request an origin-scoped bypass cookie.
5. Save only the cookie in temporary storage state; configure the browser project to
   use it; delete the file on success/failure.
6. Add a cross-origin smoke assertion proving later requests contain no secret
   header/value.

### Whitelist workflow

1. Pin checkout to `9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0`.
2. Pin setup-node to `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e`, Node 24.
3. Pass payload and secrets through `env`; never interpolate expressions into shell.
4. Validate URL with `node scripts/preview-origin.mjs` before the Dexie CLI.
5. In one step use `umask 077`, `mktemp -d`, cleanup trap, exact `printf '%s'`, CLI
   execution, and cleanup on all exits.
6. Never print secrets or silently prepend a scheme.

Acceptance: the bypass secret is sent once only to the validated Writer origin; no
browser/Dexie request gets it; hostile dispatch URLs are rejected before credentials
are written.

Commits:

1. `ci(e2e): scope the Vercel bypass secret to preview setup`
2. `ci(cloud): validate whitelist origins and protect credentials`

## Packet 8: preserve hash routes

Finding: `App.tsx:97`.

Add tests for path/query preservation, `#/settings?tab=account`, other parameters,
all supported development parameters, App routing, and a cloud E2E location check.

Implementation:

```ts
url.searchParams.delete(name);
window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
```

Do not rewrite route shapes or add compatibility logic.

Commit: `fix(app): preserve hash routes after development boot parameters`.

## Exact file plan

Expected existing files:

1. `src/App.tsx` and `src/App.test.tsx`.
2. `src/components/errors/CloudKeyErrorScreen.{tsx,test.tsx,stories.tsx}`.
3. `src/components/errors/RouteErrorScreen.{tsx,test.tsx}`.
4. `src/components/surfaces/WriteSurface.{tsx,test.tsx,stories.tsx}`.
5. `src/hooks/useDocCrdtReady.{ts,test.tsx}`.
6. `src/lib/cloud/cloudClient.{ts,test.ts}`.
7. `src/lib/cloud/crypto/{envelope,keyStore,middleware}.{ts,test.ts}`.
8. `src/lib/cloud/{escrowReconcile,reconcile,setup}.{ts,test.ts}`.
9. `src/lib/collab/types.ts` and `yjs/DexieCollabStore.{ts,test.ts}` plus
   `yjs/YjsProvider.test.ts`.
10. `src/lib/docs/docRepository.{ts,test.ts}`, `index.ts`, and
    `deleteDocCascade.{ts,test.ts}`.
11. `src/lib/space/deleteSpaceCascade.{ts,test.ts}`.
12. `src/lib/format/importSpaceArchive.{ts,test.ts}` and
    `restoreSpaceArchive.{ts,test.ts}`.
13. `src/db/seed.{ts,test.ts}`.
14. `src/i18n/locales/en/screens.json`.
15. `scripts/cloud-device-harness.mjs`.
16. `playwright.preview.config.ts` and whitelist workflow.
17. `e2e/cloud-sync.spec.ts`, `cloud-crdt-recovery.spec.ts`, and
    `preview-smoke.spec.ts`.
18. Cloud-sync/multiple-tabs Help, technical specification, architecture, and cloud
    design note.

Expected new files:

1. `RootLayout.{tsx,test.tsx,stories.tsx}` under `components/chrome`.
2. `LockBanner.{tsx,test.tsx,stories.tsx}` and
   `CrdtMountErrorBanner.{tsx,test.tsx,stories.tsx}` under `components/surfaces`.
3. `src/hooks/useAppBoot.{ts,test.ts}`.
4. `src/lib/docs/docBodyBaseline.{ts,test.ts}`.
5. `src/lib/cloud/crypto/binaryJsonCodec.{ts,test.ts}`.
6. `scripts/preview-origin.{mjs,test.mjs}`.
7. `playwright.preview.setup.ts`.

If an extraction produces a second component/service in one file, split it and add
the matching test/story rather than co-locating it.

## Contracts affected

1. `CollabStore`: remove `lastUpdateAt`; update store, fixtures, and callers.
2. Keystore records: require explicit `accountId`; update every save/load caller.
3. `EscrowReconcileResult`: add explicit keyless/no-publish result.
4. `useDocCrdtReady`: return discriminated readiness and retry, not boolean.
5. `CloudKeyErrorScreenProps.onReset`: change to awaited promise.
6. `cloudClient.ts`: expose session, reset, error classification, and mount reconcile
   operations required by UI.
7. `docRepository.ts`: atomically maintain provenance and expose accepted-pull write.
8. `EditorFacade.tsx`: no change planned; stop if one becomes necessary.

## Help and specification updates

Update `cloud-sync.md` with account-bound keys, account switching, reset retry,
empty-account recovery validation, and the editor reconciliation failure. Update
`working-in-multiple-tabs.md` to explain local Yjs history versus the cloud body read
model and provenance-based conflict choice without excessive implementation jargon.

Update:

- technical specification sections 4.9.1, 4.11, and 7;
- architecture sections 1, 4, 6, 8, 9, and 10;
- cloud design note sections 3 through 6 and 9.

Correct the stale cloud design claim that no Help article exists. `AGENTS.md` requires
Help for user-facing behaviour.

## DB migration needed?

No application-database migration is planned. Provenance uses existing local-only
`meta`; `docUpdates` remains local-only; account binding changes non-indexed values in
the separate keystore while indexes remain unchanged. Do not edit `stores.ts`, add a
Dexie version, or change `UNSYNCED`/`SYNCED_TABLES`. Missing new account bindings are
invalid greenfield data, not a migration case.

If implementation proves a schema change is necessary, stop and add the complete
persistence migration checklist before seeking approval.

## Coverage plan

The failing job reported lines 97.91% (<98%) and statements 96.79% (<97%). At source
commit `405451e`, `npm run test:coverage` passes 302 files and 2,056 tests with:

- lines 98.11% (`6930/7063`);
- statements 97.00% (`7620/7855`);
- functions 96.77%;
- branches 91.18%.

Acceptance: unit lines/statements remain >=98%/>=97%; changed user-facing paths reach
>=95% local E2E coverage; no baseline is lowered; red/skipped/unrun tests stay open.

## Verification commands

```bash
git status -sb
git log --oneline --decorate -15
git diff --stat feat/collaborative-editing...HEAD
npx eslint <changed-files> --max-warnings=0
node --test scripts/preview-origin.test.mjs
npx vitest run src/lib/cloud src/lib/docs src/lib/collab \
  src/hooks/useDocCrdtReady.test.tsx \
  src/components/surfaces/WriteSurface.test.tsx \
  src/components/errors/CloudKeyErrorScreen.test.tsx \
  src/components/errors/RouteErrorScreen.test.tsx src/App.test.tsx
npm run lint
npm run typecheck
npm run build
npm run test:run
npm run test:coverage
npm run build-storybook
npm run test:e2e
npm run test:e2e:coverage
```

Agents run E2E headlessly. If Chromium is missing, install it and retry once. Do not
defer runnable local tests to CI.

## Live two-device protocol

1. Confirm target account and URL with the user.
2. Ask whether destructive cleanup is allowed. Without an explicit yes, do not use
   `--purge`; use uniquely named probe content.
3. Start the harness headlessly.
4. Ask the user for device A's OTP and enter only what they provide.
5. Complete setup/unlock through the signed-in keyless surface.
6. Repeat OTP and key acquisition for device B.
7. Verify both device-registry rows before measuring sync.
8. On A create/rename a document and enter distinctive multi-paragraph content.
9. On B verify name/full content without reload; edit and verify A converges.
10. Upload a maximum attachment on A; verify MIME, length, and hash on B.
11. Sign A into a different empty account; verify old key is unusable and writes lock.
12. Delete only probe data and record cleanup.
13. Save content-free diagnostics only. Never save OTPs, recovery codes, passphrases,
    key material, document content, or secrets.

## Suggested commit sequence

1. `refactor(app): split root layout and boot orchestration`
2. `refactor(editor): split write surface helpers`
3. `refactor(cloud): encapsulate device keystore state`
4. `refactor(cloud): scope reconciliation runtime to the session`
5. `fix(cloud): bind device keys to their cloud account`
6. `fix(cloud): make device reset and recovery fail safely`
7. `fix(cloud): hide sealed rows whenever no key is loaded`
8. `fix(cloud): encode encrypted binary values as base64`
9. `fix(collab): reconcile pulled bodies using local provenance`
10. `fix(editor): block mount until CRDT reconciliation succeeds`
11. `test(cloud): exercise signed-in key acquisition in the device harness`
12. `ci(e2e): scope the Vercel bypass secret to preview setup`
13. `ci(cloud): validate whitelist origins and protect credentials`
14. `fix(app): preserve hash routes after development boot parameters`
15. `docs(cloud): align Help and architecture with remediation`

## PR completion

Re-read the current PR template immediately before editing the description. Keep the
PR Draft. Use the exact headings/order/hidden comments, list commits from
`git log develop..HEAD --oneline`, add numbered manual steps and required screenshots,
and tick only accurate non-human items. Never tick either human attestation. Leave the
agent reviewer box unticked until title/body conform exactly. Confirm no secrets,
OTPs, credentials, reports, or local storage state were committed.

## Definition of done

Every review finding has a regression test; all packet criteria pass; Help/spec/docs
match behaviour; unit lines/statements remain >=98%/>=97%; changed user-facing E2E
paths reach 95%; the approved live protocol is recorded honestly; the PR template
conforms; and the live todo list has no red, skipped, unanswered, or unverified item.
