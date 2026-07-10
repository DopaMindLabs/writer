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

### WP1 — regression tests

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

Done:

- Every test fails for expected reason before code changes.
- No test uses hardcoded waits or forced clicks.

Rollback boundary: tests only.

### WP2 — canonical passphrase contract

Files:

- `src/lib/cloud/crypto/keys.ts`
- `src/components/settings/tabs/cloud/PassphraseSetupDialog.tsx`
- Matching tests and docs.

Contract:

- One exported canonicalisation function.
- Setup comparison, strength/length validation, wrap, and unwrap use same canonical value.
- ASCII behaviour unchanged.
- NFC/NFD and compatibility-equivalent strings behave consistently.

Done:

- Dialog and crypto tests pass.
- Technical docs say NFKC explicitly.

Rollback boundary: passphrase follow-up only.

### WP3 — reactive key revision

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

Done:

- Device B navigation updates without reload.
- Existing query key-change guards still prevent stale results.
- No query renders sealed partial rows.

Rollback boundary: same-tab query reactivity.

### WP4 — cross-tab key-ring synchronisation

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

Done:

- Unlocking Tab A refreshes Tab B without reload.
- Forgetting key locks/hides content consistently in every tab.

Rollback boundary: cross-tab only; same-tab revision remains.

### WP5 — reconciliation trigger runner

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

Done:

- Rapid trigger test proves no overlap.
- Pull-complete-without-phase-transition test reconciles.
- Key acquisition test reconciles previously hidden rows.

Rollback boundary: trigger orchestration; reconciliation algorithm unchanged.

### WP6 — conflict-safe awaitable flush

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

Done:

- Tests prove both local and remote bodies recoverable.
- Repeat reconcile is idempotent.
- No floating promise in persistence path.

Rollback boundary: flush/conflict contract.

### WP7 — active-document priority and bounded work

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

Done:

- Active-doc test proves first processing order.
- Large-library benchmark keeps active reconcile under budget.
- Memory state remains bounded by current document count.

Rollback boundary: performance optimisation; correctness runner remains.

### WP8 — observability and user-visible failure

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

Done:

- Reconcile failure visible in cloud settings.
- Diagnostic fields available in development.
- No sensitive data reaches logs.

Rollback boundary: observability UI only.

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
