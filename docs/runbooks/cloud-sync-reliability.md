# Cloud Sync Reliability Runbook

## 1. Purpose

This runbook converts the Cloud Sync Reliability Plan into an ordered engineering
procedure. It is intended for an engineer or low-level coding agent implementing
Phase A without needing the original investigation or chat history.

Phase A improves the existing encrypted snapshot-sync design:

- Fix missing space, section, and document names after first sign-in.
- Make key acquisition reactive without a page reload.
- Make reconciliation triggers reliable and serial.
- Prevent local/pulled-body overwrite races.
- Reduce perceived convergence time to approximately 1–2 seconds for an idle
  source and receiver on a healthy network.
- Add enough diagnostics to distinguish slow sync from failed reconciliation.

Phase B, real-time encrypted cross-device CRDT collaboration, is documented only as
a later decision. Do not implement Phase B while executing Phase A.

### 1.1 Agent hand-off contract

This runbook is the planning deliverable and source of truth for implementation,
testing, and user-facing documentation. Do not replace it with a shorter plan.

#### Planner

The planner must:

- Produce or update this runbook, not application code.
- Make each work package independently executable.
- State files, contracts, invariants, tests, acceptance criteria, rollback boundary,
  dependencies, and unresolved decisions.
- Link every finding to source evidence.
- Record changed assumptions in the runbook before handing work onwards.
- Stop and request a decision when evidence does not support one safe implementation.

Planner hand-off is complete only when an executor can start a work package without
chat history or architectural guesswork.

#### Code executor

The executor must:

- Read sections 4–13 before changing code.
- Execute work packages in order unless the runbook explicitly permits parallel work.
- Treat safety invariants and acceptance criteria as mandatory.
- Keep changes inside the current work package and rollback boundary.
- Update the runbook when implementation reveals an incorrect path, contract, or
  dependency; do not silently diverge.
- Return changed files, tests run, acceptance criteria satisfied, and any blockers.

The executor must not redesign Phase A, begin Phase B, weaken encryption, or mark a
criterion complete without evidence.

#### Test writer/reviewer

The test writer must validate implementation against this runbook, not merely
against the code diff.

For every work package:

- Map each contract and acceptance criterion to at least one automated or documented
  manual check.
- Confirm the original regression test fails before the fix and passes afterwards.
- Test failure paths, cleanup, idempotency, cross-tab behaviour, and conflict recovery.
- Verify no hardcoded waits, forced clicks, focused tests, skipped tests, or reduced
  coverage.
- Report criteria as `PASS`, `FAIL`, or `NOT TESTED`, with evidence.
- Reject the hand-off when a mandatory criterion is untested.

#### Documentation/help writer

The documentation writer uses the verified runbook and test evidence. They must not
infer behaviour from implementation alone.

User-facing help must suit a reader with severe ADHD:

- Lead with the required action or current status.
- Use short sentences and one action per numbered step.
- Keep procedures in exact order.
- Put warnings immediately before the risky action.
- Use checklists for setup and recovery.
- Separate normal behaviour from errors.
- Quote exact button labels and error messages.
- Avoid dense paragraphs, repeated context, jargon, and optional detours.
- Put advanced diagnostics in a separate troubleshooting section.
- Never expose internal encryption details unless the user needs them to act safely.

Documentation hand-off is complete when a user can set up, verify, troubleshoot,
and recover cloud sync without reading this engineering runbook.

#### Traceability record

Each completed work package must append or provide this record:

```text
Work package:
Executor:
Changed files:
Contracts implemented:
Tests added/updated:
Commands run:
Acceptance criteria: PASS / FAIL / NOT TESTED
Manual evidence:
Runbook deviations:
Documentation impact:
Blockers:
```

## 2. Non-goals

Phase A does not:

- Sync the local `docUpdates` CRDT log between devices.
- Add live cross-device presence or cursors.
- Guarantee sub-600 ms cross-device updates.
- Remove whole-document last-writer-wins reconciliation.
- Add legacy migrations or compatibility branches.
- Weaken encryption, test coverage, lint rules, or type safety.

## 3. Current architecture

### Same-browser collaboration

Same-browser tabs use Yjs over `BroadcastChannelTransport`.

```text
Lexical edit
  → Yjs update
  → local docUpdates append
  → BroadcastChannel
  → peer tab Y.Doc
```

This path is real-time and does not use Dexie Cloud.

Primary files:

- `src/lib/collab/yjs/YjsProvider.ts`
- `src/lib/collab/yjs/DexieCollabStore.ts`
- `src/lib/collab/transport/BroadcastChannelTransport.ts`
- `src/hooks/useCollab.ts`

### Cross-device collaboration

Cross-device updates use encrypted `docs.body` snapshots.

```text
Lexical edit
  → AutosavePlugin, 600 ms debounce
  → updateDocBody
  → encrypted docs row
  → Dexie Cloud push/pull
  → reconcilePulledDocs
  → mounted editor restore or local CRDT reseed
```

Important distinction:

- `docUpdates`: local CRDT update log; listed in `UNSYNCED`; never leaves device.
- `docs.body`: encrypted Lexical JSON read model; syncs through Dexie Cloud.
- `cloudCrypto`: synced passphrase-wrapped escrow; deliberately not encrypted again
  by row middleware.

Cross-device convergence is whole-document last-writer-wins. Losing content must
remain recoverable through revisions until Phase B replaces this design.

Primary files:

- `src/editor/plugins/AutosavePlugin.tsx`
- `src/components/surfaces/WriteSurface.tsx`
- `src/lib/docs/docRepository.ts`
- `src/lib/cloud/reconcile.ts`
- `src/lib/cloud/crypto/middleware.ts`
- `src/db/buildDb.ts`

## 4. Confirmed findings

### 4.1 Passphrase normalisation — minor follow-up

Latest commit NFKC-normalises passphrases in
`src/lib/cloud/crypto/keys.ts`. This fixes visually identical Unicode
passphrases producing different KEKs across devices.

Remaining inconsistency:

- `PassphraseSetupDialog.tsx` compares raw passphrase strings.
- Crypto compares NFKC-normalised strings.
- UI can reject two values that crypto would treat as equal.
- `canonicalPassphrase` is module-local, allowing future call sites to diverge.

### 4.2 Missing navigation names after first sign-in — major

Root cause:

1. Fresh device signs in without a key.
2. Keyless middleware hides sealed rows from list reads.
3. `useLiveQuery` executes while keyless and caches empty results.
4. Unlocking saves a key in the device keystore and updates an in-memory cache.
5. No IndexedDB content row changes.
6. Existing live queries do not rerun.
7. Sidebar remains empty or names remain missing until reload/remount.

Affected content includes:

- `spaces.name`
- `sections.label`
- `docs.name`

Evidence:

- `src/lib/cloud/crypto/middleware.ts`: keyless sealed-row filtering.
- `src/lib/cloud/crypto/keyStore.ts`: key-ring cache and listener notification.
- `src/hooks/useDocuments.ts`: live queries depend only on `spaceId`/`docId`.
- `src/hooks/useSpaces.ts`: space queries have no key revision dependency.
- `src/components/chrome/Sidebar.tsx`: renders decrypted names from cached rows.
- `CloudSectionPanel.tsx`: full-page reload workaround covers only one path.

Secondary problem: key-ring cache is process/tab-local. Unlocking one tab does not
hydrate another tab automatically.

### 4.3 Reconciliation trigger gaps — major

`startCloudReconciler` runs when:

- Sync phase leaves `pulling`.
- Initial state first reaches `in-sync`.

It does not currently subscribe to `db.cloud.events.syncComplete` or key
acquisition. A successful pull or a key becoming available can therefore leave
decrypted rows unreconciled until another phase transition.

### 4.4 Overlapping full-library sweeps — major

Every trigger starts `reconcilePulledDocs()` using `void run()`.

Consequences:

- Runs can overlap.
- Every run loads every document.
- Every document may require CRDT loading and a headless Lexical snapshot.
- Active document can wait behind unrelated documents.
- Large libraries add seconds of CPU work.

### 4.5 Pending local edit versus pulled body — major

Current mounted-editor flow calls `handle.flush()`.

If it returns `true`, reconciliation assumes divergence was only local autosave lag
and skips the pulled body. The flush starts an asynchronous `updateDocBody`, which
can overwrite the just-pulled remote body.

Consequences:

- Remote content can disappear.
- Update may appear only after another sync cycle.
- User perceives slow or broken reconciliation.

### 4.6 Hidden failures — major operational issue

Reconcile failures are logged and processing continues. Escrow and CRDT readiness
paths also suppress or only log some failures.

User sees stale content rather than an actionable sync error.

## 5. Safety invariants

Never violate these rules while implementing Phase A:

- Never persist plaintext content to a synced content table.
- Keep `docUpdates` in `UNSYNCED`.
- Keep `cloudCrypto` synced and already wrapped; do not row-encrypt it.
- UI imports cloud actions/observables through `cloudClient.ts`.
- Document body writes use `src/lib/docs/docRepository.ts`.
- Preserve both local and pulled bodies during conflicts.
- Never run a headless editor inside a Dexie transaction.
- Never lower `coverage-baseline.json`.
- Never skip, weaken, or focus tests.
- Never add `any`, lint suppressions, `@ts-ignore`, or `@ts-expect-error`.
- Do not add legacy support without explicit approval.

## 6. Preflight

### Repository

- [ ] Confirm branch is based on `feat/collaborative-editing`.
- [ ] Confirm no unrelated uncommitted changes will enter implementation commits.
- [ ] Read:
  - `AGENTS.md`
  - `.agents/skills/work-on-cloud-sync/SKILL.md`
  - `.agents/skills/work-on-editor-collaboration/SKILL.md`
  - `.agents/skills/change-writer-persistence/SKILL.md`
  - `.agents/skills/test-writer-changes/SKILL.md`
  - `docs/architecture.md`
  - `docs/cloud-sync-beta.md`

### Environment

- [ ] `VITE_DEXIE_CLOUD_URL` points to intended test DB.
- [ ] Cloud flag enabled using `?cloud-sync=on`.
- [ ] Use two independent browser profiles or physical devices.
- [ ] Ensure clocks are reasonably aligned for latency measurements.
- [ ] Record browser, OS, network, commit SHA, and cloud DB URL.
- [ ] Keep recovery code and test backup before destructive sign-out/erase testing.
- [ ] Use synthetic content only.

### Baseline checks

```bash
npm run typecheck
npm run lint
npm run test:run
```

Do not begin implementation with unexplained baseline failures.

## 7. Reproduction A — missing navigation names

### Device A: create encrypted content

1. Open cloud-enabled build.
2. Set up encryption.
3. Record recovery code.
4. Sign in.
5. Create:
   - Space: `SYNC-NAME-SPACE`
   - Section: `SYNC-NAME-SECTION`
   - Document: `SYNC-NAME-DOCUMENT`
   - Body: `SYNC-NAME-BODY`
6. Wait until cloud status reports in-sync.
7. Capture:
   - `docs` row in IndexedDB.
   - `spaces` and `sections` rows.
   - Current key fingerprint.

### Device B: reproduce keyless pull

1. Use clean browser profile with no app IndexedDB or keystore.
2. Enable cloud flag.
3. Sign in before setting/unlocking passphrase.
4. Wait for cloud pull.
5. Confirm device is signed-in/keyless.
6. Observe sidebar before unlock.
7. Unlock using Device A passphrase.
8. Do not reload.
9. Observe sidebar and navigation names.

### Expected after Phase A

- Space, section, and document names appear without reload.
- Body opens correctly.
- No sealed row is rendered as a partially empty object.
- Other open tabs refresh after one tab unlocks.

### Evidence to capture

- Time of sign-in.
- Time pull completes.
- Time key ring is saved.
- Key revision before/after unlock.
- Time each live query reruns.
- Sidebar render time.
- Whether reload changes outcome.

### Fast diagnostic

If names appear immediately after reload, but not after unlock, key hydration/query
invalidation is failing. Do not change indexes or expose `name` as plaintext.

## 8. Reproduction B — delayed reconciliation

### Setup

1. Device A and B: same account, same key, both in-sync.
2. Open same document on both devices.
3. Use unique marker:

```text
SYNC-LATENCY-<UTC timestamp>
```

4. Keep DevTools open on both devices.

### Capture checkpoints

Record UTC timestamp for:

1. Device A keystroke.
2. Device A `AutosavePlugin` flush.
3. Device A `updateDocBody` completion.
4. Device A sync enters/leaves pushing.
5. Device B `syncComplete`.
6. Device B decrypted `docs.body` change.
7. Device B reconciliation start.
8. Device B active-document reconcile.
9. Device B editor restore/reseed.
10. Marker visible on Device B.

### Expected budget

- Autosave: 0–600 ms.
- Encryption + local write: normally under 50 ms.
- Healthy cloud round-trip: normally 100–500 ms.
- Active-document reconciliation: normally under 100 ms.
- Typical total: approximately 0.7–1.5 seconds.
- Acceptance target: normally within 1–2 seconds.

Large-library background work may continue after active document converges.

## 9. Diagnostic decision tree

### Marker absent from Device A `docs.body`

Likely stage: autosave/read-model write.

Inspect:

- `src/editor/plugins/AutosavePlugin.tsx`
- `src/components/surfaces/WriteSurface.tsx`
- `src/lib/docs/docRepository.ts`

Check:

- Pending debounce.
- Collaboration-tagged 2× debounce backstop.
- Unhandled `updateDocBody` failure.
- Visibility/navigation before timer flush.

### Marker in Device A `docs.body`, not pushed

Likely stage: encryption/cloud transport.

Inspect:

- `src/lib/cloud/crypto/middleware.ts`
- `src/db/buildDb.ts`
- `cloudSyncState`
- WebSocket/network status.

Check:

- Key provider available.
- Row sealed before push.
- Device online and signed in.
- CSP permits configured Dexie Cloud host.

### Marker pulled to Device B, but row hidden

Likely stage: key hydration.

Inspect:

- `src/lib/cloud/crypto/keyStore.ts`
- `src/lib/cloud/crypto/keylessLock.ts`
- `src/lib/cloud/crypto/middleware.ts`

Check:

- Device key ring loaded.
- Fingerprint matches escrow.
- Lock reason changed from `keyless`.
- Cross-tab key-ring notification received.

### Row decrypts on fresh read, navigation remains stale

Likely stage: live-query invalidation.

Inspect:

- `src/hooks/useDocuments.ts`
- `src/hooks/useSpaces.ts`
- Other encrypted-table hooks.

Check:

- Key revision included in query dependencies.
- Revision incremented after save/load/adopt/recover.
- Query reran after revision.

### Device B row changed, reconciler did not start

Likely stage: trigger subscription.

Inspect:

- `src/lib/cloud/reconcile.ts`
- `db.cloud.events.syncComplete`
- Key-ring change subscription.

Check:

- Sync-complete subscription active.
- Initial and phase-transition fallbacks active.
- Subscription cleanup not run prematurely.

### Reconciler starts late

Likely stage: overlapping/full-library sweep.

Check:

- Only one run is active.
- Repeated events set one queued rerun.
- Mounted document is processed first.
- Unchanged documents are skipped.

### Reconciler runs, editor remains stale

Likely stage: pending local edit/restore decision.

Check:

- Awaitable flush result.
- Pulled body safety revision.
- Local save awaited before deciding winner.
- Follow-up sync/reconcile queued.
- Restore/reseed error surfaced.

## 10. Phase A work packages

Execute in order. Keep each package reviewable and independently revertible.

### Mandatory TODO ledger

This six-item ledger is the execution queue. A lower-capability agent must work on
only one unchecked item at a time. The work packages below are mandatory steps
inside these six TODOs, not additional TODOs. Mark an item complete only after all
of its work packages, `Done` conditions, and acceptance criteria pass.

- [ ] `TODO-01` Capture baseline evidence and add failing regression tests.
- [ ] `TODO-02` Unify passphrase semantics and make keys reactive across tabs.
- [ ] `TODO-03` Build reliable, queued reconciliation triggers.
- [ ] `TODO-04` Preserve conflict bodies, reduce latency, and surface failures.
- [ ] `TODO-05` Validate Phase A and write ADHD-friendly user help.
- [ ] `TODO-06` Write the separate Phase B encrypted CRDT ADR and test plan.

Status rules:

1. Change `[ ]` to `[~]` when work starts.
2. Change `[~]` to `[x]` only after tests and evidence exist.
3. Leave `[ ]` and record a blocker if required evidence, API, or environment is
   unavailable.
4. Never mark dependent work complete when an earlier TODO failed.
5. Append the traceability record from section 1.1 after each completed TODO.

### TODO-01 — baseline evidence and regression proof

Depends on: nothing.

Debug procedure:

1. Run the preflight commands from section 6.
2. Execute Reproduction A exactly once on a clean Device B profile.
3. Execute Reproduction B three times on a small library.
4. Repeat Reproduction B with at least 100 documents if test data generation exists.
5. Record every timestamp listed in sections 7 and 8.
6. Confirm whether reload fixes missing names.
7. Confirm whether a new sync-state phase transition eventually fixes stale content.
8. Save redacted console and network evidence. Never capture passphrases, recovery
   codes, raw keys, bodies, or ciphertext.

Expected diagnosis:

- Reload fixing names confirms stale keyless live queries.
- Decrypted row present before editor update confirms reconciliation/restore delay.
- Source `docs.body` missing marker confirms autosave/write delay.
- Pulled body being replaced by local body confirms unsafe flush ordering.

Done:

- Baseline test commands recorded.
- Both failures reproduced or a precise environment blocker recorded.
- Timings establish which stage consumes latency.

Do not change code in this TODO.

### WP1 — regression tests

Ledger item: `TODO-01`.

Depends on: baseline evidence in `TODO-01`.

Goal: reproduce bugs before implementation.

Modify/add tests:

- `src/lib/cloud/crypto/keys.test.ts`
- `src/components/settings/tabs/cloud/PassphraseSetupDialog.test.tsx`
- `src/lib/cloud/crypto/keyStore.test.ts`
- `src/hooks/useDocuments.test.ts`
- `src/hooks/useSpaces.test.ts`
- `src/components/chrome/Sidebar.test.tsx`
- `src/lib/cloud/reconcile.test.ts`
- `e2e/cloud-sync.spec.ts`
- `e2e/cloud-crdt-recovery.spec.ts`

Required failures:

- NFKC-equivalent confirmation rejected by UI.
- Key acquired after keyless pull does not rerun content queries.
- Cross-tab key acquisition does not refresh second tab.
- `syncComplete` without phase transition does not reconcile.
- Rapid triggers overlap.
- Active document waits behind unrelated docs.
- Pending local flush can replace pulled body without preserving it.

Debug and test procedure:

1. Read the production symbol and its nearest existing test before adding a case.
2. Add one failing test per behaviour; do not combine unrelated defects.
3. For key hydration, run a query while `deviceKeyProvider.current()` is `null`,
   save/load a key ring, then assert the same mounted consumer rerenders.
4. For cross-tab behaviour, fake the channel boundary rather than mocking the
   component tree.
5. For trigger reliability, emit `in-sync`, `syncComplete`, and rapid repeated
   triggers independently.
6. For overlap, hold the first reconcile promise unresolved, trigger again, and
   assert the second run begins only after the first settles.
7. For conflict safety, model pulled body `REMOTE` and pending editor body `LOCAL`;
   assert both remain recoverable after reconcile.
8. Run each new test alone. Confirm failure text points to the intended missing
   behaviour, not broken test setup.

Done:

- Every test fails for expected reason before code changes.
- No test uses hardcoded waits or forced clicks.
- Test names state behaviour and expected outcome.
- Test fixtures contain no real cloud credentials or user data.

Rollback boundary: tests only.

### WP2 — canonical passphrase contract

Ledger item: `TODO-02`.

Depends on: `TODO-01`.

Files:

- `src/lib/cloud/crypto/keys.ts`
- `src/components/settings/tabs/cloud/PassphraseSetupDialog.tsx`
- Matching tests and docs.

Contract:

- One exported canonicalisation function.
- Setup comparison, strength/length validation, wrap, and unwrap use same canonical value.
- ASCII behaviour unchanged.
- NFC/NFD and compatibility-equivalent strings behave consistently.

Debug procedure:

1. In `keys.ts`, confirm `canonicalPassphrase` is private and `deriveKek` calls it.
2. In `PassphraseSetupDialog.tsx`, confirm `tooShort`, `mismatch`, `valid`, and
   `strengthOf` currently use raw strings.
3. Add test vectors for:
   - ASCII-equivalent passphrases.
   - Composed versus decomposed accents.
   - Full-width versus ASCII compatibility characters.
   - Canonical value below/above the minimum length boundary.
4. Confirm existing crypto test proves NFKC-equivalent values unwrap the same escrow.

Solution procedure:

1. Export one pure `canonicalisePassphrase(passphrase: string): string` from
   `keys.ts`, or a dedicated crypto utility if imports would create a cycle.
2. Keep NFKC as the only transformation. Do not trim, lowercase, or alter whitespace.
3. Derive `canonicalPassphrase` and `canonicalConfirm` once in the dialog render.
4. Use canonical values for length validation and equality.
5. Pass the canonical passphrase to `onCreate`, so UI and crypto receive identical
   input.
6. Decide strength display from the canonical value and lock that behaviour in a
   test.
7. Run dialog and crypto tests before moving on.

Done:

- Dialog and crypto tests pass.
- Technical docs say NFKC explicitly.

Rollback boundary: passphrase follow-up only.

### WP3 — reactive key revision

Ledger item: `TODO-02`.

Depends on: WP2 and `TODO-01` key hydration/query tests.

Files:

- `src/lib/cloud/crypto/keyStore.ts`
- Proposed `src/hooks/useDeviceKeyRevision.ts`
- Proposed cloud-aware live-query wrapper.
- Encrypted-table hooks.

Contract:

- `getDeviceKeyRevision(): number`
- `onDeviceKeyRingChange(listener): unsubscribe`
- Revision increments after save, load transition, adopt/recover, and forget.
- React hook uses `useSyncExternalStore`.
- Encrypted live queries include revision in dependencies.
- Local-only table hooks do not rerun unnecessarily.

Migrate encrypted reads:

- Spaces
- Sections/documents
- Notes
- Note attachments
- Connections
- Citations
- Revisions

Debug procedure:

1. Mount `useSpaces`, `useSections`, and `useDocument` with no cached key.
2. Let middleware return keyless-hidden results.
3. Call `saveDeviceKeyRing` without changing any app DB row.
4. Confirm `onDeviceKeyRingChange` fires but `useLiveQuery` does not rerun.
5. List every hook that reads a table covered by encrypted row middleware.
6. Separate encrypted content queries from local-only and plaintext-special tables.

Solution procedure:

1. Add module-local monotonic `deviceKeyRevision`, initial value `0`.
2. Export a synchronous getter returning only that number.
3. Increment it after a successful key-ring cache transition:
   - Save.
   - Load.
   - Forget.
   - Adopt/recover paths that call save.
4. Notify listeners after the revision changes.
5. Implement `useDeviceKeyRevision` with `useSyncExternalStore`; use the same getter
   for client and server snapshots.
6. Add a cloud-aware live-query wrapper that includes key revision in the dependency
   array. The query need not read the number; the dependency forces reevaluation.
7. Preserve `useKeyedLiveQuery` stale-key protection when adding revision.
8. Migrate encrypted table hooks one file at a time.
9. Do not migrate `docUpdates`, keystore tables, or `cloudCrypto`.
10. Run the hook's focused tests after each migration.

Done:

- Device B navigation updates without reload.
- Existing query key-change guards still prevent stale results.
- No query renders sealed partial rows.

Rollback boundary: same-tab query reactivity.

### WP4 — cross-tab key-ring synchronisation

Ledger item: `TODO-02`.

Depends on: WP3.

Files:

- Proposed key-ring synchroniser under `src/lib/cloud/crypto/`.
- `src/App.tsx` boot/cleanup.
- `keyStore` tests.

Contract:

- Saving/forgetting a key broadcasts after keystore transaction commits.
- Receiving tab reloads key ring from `lipsum-cloud-keystore`.
- Receiving tab increments local revision and notifies hooks.
- Message handling does not rebroadcast indefinitely.
- Channel closes during cleanup.

Debug procedure:

1. Open two tabs against the same browser profile.
2. Unlock Tab A.
3. Confirm Tab A's in-memory cache changes and Tab B's cache remains unchanged.
4. Reload Tab B and confirm the persisted keystore lets content appear.
5. This proves persistence is correct and process-local invalidation is missing.

Solution procedure:

1. Add one small synchroniser under `src/lib/cloud/crypto/`.
2. Use a dedicated `BroadcastChannel` name scoped to the device key-ring concern.
3. Broadcast only an invalidation message after `saveDeviceKeyRing` or
   `forgetDeviceKeyRing` successfully commits. Never send key material.
4. Include a per-tab source ID and operation (`changed` or `forgotten`) for
   diagnostics.
5. On a foreign message, call `loadDeviceKeyRing` to read the authoritative
   IndexedDB value.
6. Do not broadcast from the receive path; otherwise tabs can form a message loop.
7. Start the synchroniser after `hydrateCloudDevice()` and before cloud content
   consumers mount.
8. Return cleanup that removes the listener and closes the channel.
9. Treat unavailable `BroadcastChannel` as a documented degraded mode if supported
   browsers require it; do not fall back to key material in `localStorage`.

Done:

- Unlocking Tab A refreshes Tab B without reload.
- Forgetting key locks/hides content consistently in every tab.

Rollback boundary: cross-tab only; same-tab revision remains.

### WP5 — reconciliation trigger runner

Ledger item: `TODO-03`.

Depends on: `TODO-02`.

Files:

- `src/lib/cloud/reconcile.ts`
- `src/lib/cloud/cloudClient.ts`
- `src/App.tsx`
- Tests.

Trigger sources:

- Initial `in-sync`.
- Transition out of `pulling`.
- `db.cloud.events.syncComplete`.
- Key acquisition.

Runner contract:

- Maximum one active run.
- Trigger during active run sets one queued rerun.
- Queued rerun starts after current run settles.
- Errors update status and do not kill subscriptions.
- Stop function unsubscribes every source.

Debug procedure:

1. In `startCloudReconciler`, hold `run()` unresolved.
2. Emit two qualifying sync states.
3. Confirm two promises start concurrently.
4. Emit `syncComplete` without a `pulling` transition and confirm no run starts.
5. Acquire a key after a keyless pull and confirm no run starts.
6. Verify the Dexie Cloud version's exact `syncComplete` subscription and cleanup
   API before writing the adapter.

Solution procedure:

1. Expose a minimal sync-complete subscription through `cloudClient.ts`. Keep addon
   details out of React UI.
2. Route initial in-sync, left-pulling, sync-complete, and key-change events into one
   `requestReconcile(trigger)` function.
3. Track `stopped`, `activePromise`, and one `queued` flag in the runner closure.
4. If stopped, ignore the request.
5. If a run is active, set `queued = true` and return.
6. If idle, start one run and catch its rejection into reconcile status.
7. In `finally`, clear the active promise. If queued and not stopped, clear queued
   and schedule exactly one follow-up request.
8. Do not use an unbounded loop or uncaught floating promise.
9. On cleanup, mark stopped and unsubscribe sync state, sync complete, and key
   listeners. Let an already-running promise settle without starting its queued run.
10. Keep per-document failure isolation, but aggregate failures for status.

Done:

- Rapid trigger test proves no overlap.
- Pull-complete-without-phase-transition test reconciles.
- Key acquisition test reconciles previously hidden rows.

Rollback boundary: trigger orchestration; reconciliation algorithm unchanged.

### WP6 — conflict-safe awaitable flush

Ledger item: `TODO-04`.

Depends on: `TODO-03`.

Files:

- `src/lib/collab/editorRegistry.ts`
- `src/editor/plugins/RestoreBridgePlugin.tsx`
- `src/editor/plugins/AutosavePlugin.tsx`
- `src/components/surfaces/WriteSurface.tsx`
- `src/lib/cloud/reconcile.ts`
- Tests.

Contract:

- Flush is awaitable.
- Flush reports whether it persisted content and which body it persisted.
- `updateDocBody` completion is awaited.
- Pulled body is saved as a safety revision before local body can replace it.
- Clean editor still accepts pulled body.
- Pending local editor remains visible, then follow-up sync/reconcile is queued.
- Neither side disappears silently.

Debug procedure:

1. Confirm `AutosavePlugin.flushPendingSave` sets `lastSavedRef` before calling the
   non-awaitable `onChange`.
2. Confirm `WriteSurface.handleChange` starts `updateDocBody` with `void`.
3. Confirm `reconcileDoc` returns immediately when `handle.flush()` returns `true`.
4. In a test, delay `updateDocBody`; set DB body to `REMOTE`; make editor flush
   `LOCAL`; release the delayed write.
5. Confirm final DB body becomes `LOCAL` and `REMOTE` was not first preserved.

Solution procedure:

1. Define a dedicated flush result type in a `*.types.ts` file:
   - No pending body.
   - Persisted body with the exact serialised value.
2. Change the complete callback chain to return `Promise<void>`:
   - `EditorFacade`
   - `LexicalEditor`
   - `EditorPlugins`
   - `AutosavePlugin`
   - `WriteSurface.handleChange`
3. Change `flushRef` and `EditorHandle.flush` to return a promise of the typed result.
4. In `WriteSurface.handleChange`, await `updateDocBody`; handle revision capture
   separately without hiding body-write failure.
5. In autosave, await `onChange`. Update `lastSavedRef` only after persistence
   succeeds; on failure retain pending state so retry remains possible.
6. Timer callbacks must catch and report rejected flushes. No unhandled promise.
7. In reconciliation, capture `pulledBody = doc.body` before invoking flush.
8. If a pending local body exists:
   - Create a safety revision containing `pulledBody`.
   - Await the local flush.
   - Leave the live local editor visible.
   - Request a follow-up cloud sync/reconcile.
9. If no pending local body:
   - Preserve the differing local CRDT snapshot as `pre-sync`.
   - Apply the pulled body through mounted restore or unmounted reseed.
10. If safety revision creation or body persistence fails, stop that document's
    reconcile and surface the error. Never continue destructively.
11. Update `RestoreBridgePlugin`, autosave, editor registry, write surface, and
    reconcile tests for the async contract.

Done:

- Tests prove both local and remote bodies recoverable.
- Repeat reconcile is idempotent.
- No floating promise in persistence path.

Rollback boundary: flush/conflict contract.

### WP7 — active-document priority and bounded work

Ledger item: `TODO-04`.

Depends on: WP6.

Files:

- `src/lib/collab/editorRegistry.ts`
- `src/lib/cloud/reconcile.ts`
- Tests/benchmarks.

Contract:

- Registry exposes mounted document IDs.
- Mounted docs reconcile before unmounted docs.
- Runner remembers bounded last-seen state.
- Deleted IDs are pruned.
- Unchanged docs skip expensive snapshot.
- Background work yields between bounded batches.

Debug procedure:

1. Seed many documents with the mounted document last in creation/order order.
2. Instrument reconcile start per document.
3. Confirm `db.docs.toArray()` order controls processing and mounted doc waits.
4. Trigger a second run with unchanged row bodies.
5. Confirm every document still loads all CRDT updates and serialises a snapshot.
6. Record active-document and total sweep durations.

Solution procedure:

1. Add a read-only registry function returning a copied list of mounted document IDs.
   Never expose the mutable `Map`.
2. Partition fetched docs into mounted and unmounted arrays while preserving stable
   order inside each group.
3. Process mounted docs first.
4. Keep a bounded map from document ID to the last successfully examined `docs.body`
   value or safe fingerprint.
5. Skip a document when its body is unchanged since successful reconciliation.
6. Update last-seen state only after that document completes successfully.
7. Remove entries for IDs absent from the current DB result.
8. Process unmounted docs in a fixed batch size and yield through a scheduler helper
   between batches. Do not add an unbounded loop.
9. Keep correctness independent of the cache: clearing it may cost work but must not
   change results.
10. Re-run the large-library baseline and compare active-document latency.

Done:

- Active-doc test proves first processing order.
- Large-library benchmark keeps active reconcile under budget.
- Memory state remains bounded by current document count.

Rollback boundary: performance optimisation; correctness runner remains.

### WP8 — observability and user-visible failure

Ledger item: `TODO-04`.

Depends on: WP5–WP7.

Files:

- Cloud reconcile status module/facade.
- `src/components/settings/tabs/cloud/CloudSyncStatusRow.tsx`
- Tests.

Record:

- Trigger.
- Start/end time.
- Duration.
- Documents scanned/skipped/reconciled.
- Active document latency.
- Queued rerun.
- Last error code/message.

Do not log:

- Document body.
- Passphrase.
- Recovery code.
- Raw key material.
- Ciphertext payload.

Debug procedure:

1. Force one document's `collabStore.loadAll`, revision write, or restore to reject.
2. Confirm current behaviour only writes `console.error`.
3. Confirm cloud settings still implies healthy sync.
4. Record which metadata is sufficient to locate the failed stage without content.

Solution procedure:

1. Add a small immutable reconcile-status store/facade.
2. Use a discriminated status such as idle/running/succeeded/failed.
3. Record trigger, run ID, timestamps, counters, active-doc latency, queued flag, and
   sanitised error code/message.
4. Never store or log content, passphrases, recovery codes, keys, or payloads.
5. Update status at runner boundaries; aggregate per-document failures.
6. Surface failed status and retry action in `CloudSyncStatusRow`.
7. Ensure retry calls the same single-flight request path.
8. Add tests for success, partial failure, retry, and sensitive-field absence.

Done:

- Reconcile failure visible in cloud settings.
- Diagnostic fields available in development.
- No sensitive data reaches logs.

Rollback boundary: observability UI only.

### TODO-05 — Phase A validation and user help

Depends on: `TODO-01`–`TODO-04`.

Procedure:

1. Run every focused command in section 11.
2. Run full type, lint, unit/component, E2E, and coverage gates.
3. Execute Reproduction A twice:
   - Clean Device B first sign-in.
   - Two already-open tabs, unlocking only one.
4. Execute Reproduction B at least three times on small and large libraries.
5. Exercise local/remote conflict in both arrival orders.
6. Force a reconcile failure and confirm visible, retryable status.
7. Confirm sign-out, forget-key, remount, and app cleanup remove listeners/channels.
8. Compare measured timings against section 12.
9. Mark every section 12 criterion `PASS`, `FAIL`, or `NOT TESTED`.
10. Do not approve Phase A with a mandatory `FAIL` or `NOT TESTED`.

Done:

- All mandatory gates pass.
- Coverage baseline is unchanged or higher.
- Evidence confirms names appear without reload.
- Evidence confirms normal idle convergence within 1–2 seconds.
- Both conflicting bodies remain recoverable.

#### ADHD-friendly help documentation

Depends on: successful Phase A validation above.

Procedure:

1. Use only behaviour proven by `TODO-05` validation.
2. Write separate short procedures for:
   - First-device setup.
   - Second-device unlock.
   - Confirming sync health.
   - Retrying a failed reconcile.
   - Recovery and forgetting a device.
3. Put one user action in each numbered step.
4. Lead each section with the expected result.
5. Quote exact UI labels and verified error messages.
6. State the expected 1–2 second idle delay once; do not promise real-time sync.
7. Put destructive warnings immediately before destructive actions.
8. Move engineering diagnostics to a collapsed or separate troubleshooting section.
9. Ask a test reader unfamiliar with the implementation to follow each procedure.
10. Correct this runbook if verified user behaviour differs from its claims.

Done:

- User can set up, unlock, verify, retry, and recover without engineering context.
- No paragraph contains multiple required actions.
- Help does not expose sensitive implementation details.

### TODO-06 — Phase B encrypted cross-device CRDT ADR

Depends on: successful `TODO-05`.

Scope:

- Planning and test design only.
- Do not change sync behaviour.
- Do not sync `docUpdates` during this TODO.
- Keep `docs.body` as the Phase A projection until the ADR is approved and Phase B
  is separately authorised.

Research procedure:

1. Read section 15, current Yjs/BroadcastChannel code, Dexie Cloud integration, row
   encryption middleware, key rotation/recovery, revisions, deletion, and backup
   paths.
2. Draw the current same-tab and cross-device data flows.
3. Record every place that assumes `docUpdates` is local-only.
4. Compare exactly two transport candidates:
   - Encrypted Yjs update rows replicated through Dexie Cloud.
   - Dedicated authenticated WebSocket transport carrying encrypted Yjs updates.
5. For each candidate, determine:
   - Offline replay behaviour.
   - Update ID generation and deduplication.
   - Ordering independence.
   - Compaction/checkpoint ownership.
   - Key lookup and rotation.
   - Device recovery.
   - Deletion/tombstone propagation.
   - Presence privacy and expiry.
   - Server trust and plaintext exposure.
   - Operational cost and failure recovery.
6. Do not select a transport without evidence for all ten criteria.

Solution procedure:

1. Create `docs/adr/0001-encrypted-cross-device-crdt.md`.
2. Use ADR sections: Status, Context, Decision Drivers, Options, Decision, Data Model,
   Encryption Model, Failure Handling, Migration, Test Matrix, Rollback, Open
   Questions, and Consequences.
3. Define immutable update identity using document ID, client/device identity, and a
   collision-safe update ID. Do not depend on arrival order.
4. Define idempotent replay and duplicate handling before defining transport.
5. Define an encrypted checkpoint/compaction protocol with a bounded retained-update
   policy.
6. Define how a recovered or newly unlocked device obtains keys before replay.
7. Define deletion/tombstone semantics that cannot resurrect deleted documents.
8. Define `docs.body` as a derived projection and name the single owner responsible
   for updating it.
9. State when Phase A snapshot reconciliation can be disabled.
10. Design tests before implementation:
    - Simultaneous two-device edits.
    - Offline edits on both devices, then reconnect.
    - Duplicate and reordered update delivery.
    - Interrupted compaction.
    - Key rotation during pending updates.
    - Device recovery with historical updates.
    - Delete versus offline edit.
    - Multi-tab plus multi-device convergence.
    - Projection rebuild from checkpoint plus updates.
    - No plaintext in synced storage or transport.
11. Use a clean schema reset rather than legacy migration because there are no users,
    but document the exact reset boundary and data-loss warning.
12. Submit the ADR for explicit approval. Do not begin Phase B implementation from
    an unapproved ADR.

Done:

- ADR chooses one transport with evidence.
- Data, encryption, compaction, deletion, recovery, and projection contracts are
  explicit.
- Test matrix covers convergence, failure, offline, security, and cleanup paths.
- Phase A and Phase B responsibilities remain separate.
- No application, schema, or test code changed in this TODO.

## 11. Test matrix

### Unit

```bash
npx vitest run src/lib/cloud/crypto/keys.test.ts
npx vitest run src/lib/cloud/crypto/keyStore.test.ts
npx vitest run src/lib/cloud/reconcile.test.ts
npx vitest run src/hooks/useDocuments.test.ts
npx vitest run src/hooks/useSpaces.test.ts
```

### Component

```bash
npx vitest run src/components/settings/tabs/cloud/PassphraseSetupDialog.test.tsx
npx vitest run src/components/chrome/Sidebar.test.tsx
npx vitest run src/components/settings/tabs/cloud/CloudSyncStatusRow.test.tsx
```

### E2E

```bash
npx playwright test e2e/cloud-sync.spec.ts
npx playwright test e2e/cloud-crdt-recovery.spec.ts
```

Add dedicated two-context test if current cloud harness can isolate two profiles
against one test account. If live cloud cannot run in CI, keep deterministic local
integration coverage plus mandatory manual protocol.

### Full gates

```bash
npm run typecheck
npm run lint
npm run test:run
npm run test:e2e
npm run test:e2e:coverage
```

Coverage:

- Target at least 95% for changed feature paths.
- Hard floor 85% only with explicit user direction after documented blocker.
- Never lower existing baseline.

## 12. Acceptance criteria

### Key hydration/navigation

- [ ] First sign-in on clean Device B may pull while keyless.
- [ ] Unlock makes spaces, sections, and document names visible without reload.
- [ ] Adopt/recover/setup/unlock all use same key-acquired path.
- [ ] Unlock in one tab refreshes all open tabs.
- [ ] No sealed row appears as an empty named item.

### Reconciliation

- [ ] Successful sync completion triggers reconciliation.
- [ ] Key acquisition triggers reconciliation.
- [ ] Runs never overlap.
- [ ] Repeated triggers coalesce into one follow-up run.
- [ ] Active document is processed first.
- [ ] Unchanged documents skip expensive snapshot work.
- [ ] Errors are visible and retryable.

### Conflict safety

- [ ] Pending local body remains recoverable.
- [ ] Pulled remote body remains recoverable.
- [ ] No asynchronous flush silently overwrites unpreserved remote content.
- [ ] Repeated reconciliation remains idempotent.

### Performance

- [ ] Idle small-library convergence normally completes within 1–2 seconds.
- [ ] 600 ms autosave remains documented as expected floor.
- [ ] Large-library background sweep does not block active document convergence.

## 13. Rollout

Recommended PR order:

1. Tests + canonical passphrase contract.
2. Same-tab key revision + encrypted live queries.
3. Cross-tab key-ring synchronisation.
4. Reconcile trigger runner.
5. Conflict-safe awaitable flush.
6. Active-document priority/batching.
7. Observability and final documentation.

For each PR:

- Capture baseline failing test.
- Keep change inside one rollback boundary.
- Run targeted tests before full gates.
- Record manual two-device outcome.
- Do not combine refactors with behavioural change.

Rollback:

- Revert newest package only.
- Never roll back by disabling encryption or syncing plaintext.
- Preserve safety revisions and user data.
- If reliability regresses, disable new trigger/optimisation path behind existing
  cloud beta gate rather than changing schema or deleting content.

## 14. Bug report template

```text
Title:
Commit:
Browser/OS Device A:
Browser/OS Device B:
Cloud DB URL/environment:
Cloud flag enabled:
Device A key fingerprint:
Device B key fingerprint:
Signed-in/keyless observed:
Document count:
Active document ID:
Marker:

Timestamps UTC:
- Keystroke:
- Autosave flush:
- Source docs.body write:
- Source push complete:
- Target pull/syncComplete:
- Key acquired:
- Live query rerun:
- Reconcile start/end:
- Editor visible:

Observed:
Expected:
Reload changes result:
Other tab changes result:
Last reconcile trigger:
Last reconcile error:
Console/network evidence:
Sensitive data removed: yes/no
```

## 15. Phase B readiness checklist

Start Phase B only after Phase A acceptance passes.

Create a separate ADR covering:

- Encrypted append-only Yjs updates through Dexie Cloud versus dedicated WebSocket
  provider.
- Update identity and deduplication.
- Ordering independence and idempotent replay.
- Compaction/checkpoint rules.
- Offline edit/reconnect convergence.
- Cross-device presence transport and privacy.
- Key rotation and recovery.
- Document deletion/tombstones.
- Backup/restore interaction.
- `docs.body` derived projection ownership.
- Removal point for snapshot LWW reconciler.
- Simultaneous two-device edit tests.
- Multi-tab plus multi-device tests.
- Clean schema reset strategy while there are no users.

Do not extend Phase A until it becomes Phase B accidentally. If work requires synced
CRDT deltas or live presence, stop and move it to the ADR.

## 16. References

- `docs/architecture.md`
- `docs/cloud-sync-beta.md`
- `docs/technical-specification.md`
- `.agents/skills/work-on-cloud-sync/SKILL.md`
- `.agents/skills/work-on-editor-collaboration/SKILL.md`
- `.agents/skills/change-writer-persistence/SKILL.md`
- `.agents/skills/test-writer-changes/SKILL.md`
- [Dexie Cloud `syncComplete`](https://dexie.org/docs/cloud/db.cloud.events.syncComplete)
