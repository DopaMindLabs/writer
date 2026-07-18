# Runbook: SyncProvider abstraction + realm access-control groundwork
Status: active
Working branch: feat/syncprovider-realms (cut from 24cf41b, the head of PR #170 / feat/collaborative-editing)
Verify mode: local (mandated by AGENTS.md gates, 2026-07-18)
Author: Shavindra <1387263+Shavindra@users.noreply.github.com>  (confirmed by user, 2026-07-18)
PR: ask first

## Purpose

Support multi-space, multi-user collaboration (user directive, 2026-07-18). Two threads
from the PR #170 discussion:

1. **One public provider abstraction named `SyncProvider`** with optional capabilities
   (`frameSync`, `realtime`, `discovery`, `accessControl`, `keyDelivery`), a
   `SyncCoordinator` that receives one or many providers, and `SyncProviderBinding`
   vocabulary. `replication` stays an internal term only. Dexie Cloud becomes the first
   provider (`frameSync`, `accessControl`, `keyDelivery`).
2. **Realm groundwork**: today `Space`/`Doc` declare no `realmId`, no
   `realms`/`members`/`roles` tables exist, and Dexie Cloud puts every row in the
   creator's private realm. Add the addon-managed access-control tables, carry
   `realmId` on synced row types, and provide space-level share/member operations —
   `spaceId` stays an application relationship; the realm is the access-control boundary.

The intended long-term package layout (`@dopamind/writer-sync/core`, `/providers/dexie-cloud`,
`/providers/webrtc`, `/providers/bluetooth`) is recorded as direction only. This runbook keeps
code in-repo: core contracts under `src/lib/syncProviders/`, the Dexie Cloud adapter beside the
cloud subsystem. Package extraction is a later, separate piece of work (see Questions).

Guardrails:
- **Pre-release: no users, no backward compatibility** (user, 2026-07-18). Never write a
  migration, backfill, dual-read fallback, or legacy branch to preserve existing data or
  older formats — there is none to preserve. `realmId` is optional because an unshared space
  genuinely has no realm, not for compatibility. This does not relax the two server-side
  blockers, which are about what a second member can do, not about old data.
- Do not touch `src/lib/sync/` — that is the folder-export feature (File System Access API),
  unrelated to cloud sync or collaboration. Do not conflate the new abstraction with it or
  with `src/lib/collab/` (same-browser multi-tab CRDT).
- `docUpdates` stays in `UNSYNCED` (local-only), always. The `frameSync` capability is
  interface-only in this runbook: implementing cross-device frame replication would foreclose
  the recorded open decision (whole-doc LWW vs lossless CRDT merge, docs/architecture.md §4).
  If a task seems to require syncing frames, stop and report.
- `realms`, `members`, `roles` are addon-managed plaintext tables: never add them to
  `SYNCED_TABLES` (the server must read them for access control) and never add them to
  `UNSYNCED` (they must replicate). `cloudCrypto` stays synced and never row-encrypted.
- The encryption middleware stays installed above the cloud addon; any provider may only ever
  see ciphertext for content tables. Keep `largeStringThreshold: Infinity` and inline base64
  envelopes.
- **UI consumes capabilities through the `SyncProvider` adapter, never the cloud facade**
  (user direction, 2026-07-18: the backend "could be dexie or someone else"). Components and
  hooks must not import `@/lib/cloud/cloudClient`: it is a facade that hides the subsystem's
  complexity but not its identity, and it leaks Dexie-Cloud-shaped types. `cloudClient` stays
  the only module that touches `db.cloud`, and becomes an implementation detail of the
  adapter. `dexie-cloud-addon` is imported only in `src/db/buildDb.ts` (plus type-only
  imports). Existing direct importers are a tracked backlog — see Stage 2b — not licence to
  add more.
- **Never add an adapter method without its first caller.** An unconsumed capability is
  unreachable code that no honest test covers, and the e2e ratchet rejects it (it already did
  once, at S2.T1). Capability *contracts* may be declared ahead of use; *implementations* land
  with their consumer.
- `src/lib/collab/types.ts` imports nothing from yjs; no `Y.applyUpdate`/`Y.mergeUpdates`
  outside `src/lib/collab/yjs/`. The new core contracts in `src/lib/syncProviders/` import
  nothing from `src/lib/cloud/**`, `dexie-cloud-addon`, or yjs (abstractions must not depend
  on concretions).
- Preserve the `startCloudSession` boot order: hydrate device key ring → key-ring channel →
  cloud reconciler → escrow reconciler → keyless lock monitor → device registrar.
- Do not activate any sharing/invite UI and do not edit the 'Sharing & members' coming-soon
  copy in `src/i18n/locales/**` — multi-writer realms are blocked on the server-side
  erase/re-key owner gate (docs/cloud-sync-beta.md §5.1); see Questions. No second writer is
  enabled by this runbook.
- Never weaken or suppress lint rules, type checks, tests, version-pin tests, or coverage
  baselines. Version-pin tests (`db.test.ts`, `stores.test.ts`, `tableRules.test.ts`,
  `middleware.test.ts`) are updated deliberately inside S3.T1 only.
- If a file you must edit already violates repo standards (oversized functions, co-located
  components/services), land a separate `refactor:` commit first, then the task's change.
- No legacy-format fallbacks without explicit user permission.
- All copy/docs in British English. Commits are authored as the runbook header's Author —
  never as an agent, no assistant names, trailers, or session links in messages.
- Stop and report if local e2e coverage for the new feature cannot reach 95% (85% is the
  hard floor — never below), or if any gate would need relaxing.

Standards:
- Source: CODING_STANDARDS.md (Power of Ten adaptation) + AGENTS.md; commitlint + branch-name
  hooks enforce Conventional Commits everywhere.
- Lint: `npx eslint <files> --max-warnings=0`  Typecheck: `npm run typecheck`
- Tests: `npm run test:run` (Vitest), `npm run test:e2e` (Playwright, headless),
  `npm run test:e2e:coverage` (ratchet)
- Notes: arrow functions only; complexity ≤ 12, nesting ≤ 4, functions ≤ 60 lines / ≤ 3
  params; one component/service per file; test file extension mirrors file under test;
  TDD — failing test first in every task.

## Stage 1 - SyncProvider core contracts
Goal: public, dependency-free capability vocabulary + coordinator. No behaviour change, no
schema change, no UI. Stage gate before Stage 2: `npm run lint && npm run typecheck && npm run test:run`.

### S1.T1 - Capability contract types
- Goal: `src/lib/syncProviders/types.ts` defines the public abstraction exactly as agreed in
  the PR #170 discussion: `SyncProviderId`, `AccessScopeId`, `SyncProvider` (with optional
  `frameSync?: EncryptedFrameSync`, `realtime?: RealtimeSyncTransport`,
  `discovery?: PeerDiscoveryAdapter`, `accessControl?: AccessControlAdapter`,
  `keyDelivery?: KeyDeliveryAdapter`), `SyncProviderBinding { scopeId; providerId;
  externalScopeId?; enabled }`, and `WriterSyncOptions { providers: SyncProvider[] }`.
- Code refs (model each capability on the existing concrete surface, do not import it):
  - `EncryptedFrameSync`: shape it after `requestCloudSync`/`cloudSyncState`/
    `cloudSyncComplete`/`isAccountPullComplete` in `src/lib/cloud/cloudClient.ts` —
    start/stop of a session, an explicit sync request (push|pull), sync-state subscription.
  - `RealtimeSyncTransport`: reference (re-export or extend) `SyncTransport` from
    `src/lib/collab/types.ts` — do NOT redeclare a diverging transport contract; honour its
    `sharesStore` semantics.
  - `PeerDiscoveryAdapter`: shape after `src/lib/cloud/deviceRegistry.ts` /
    `devicePolicy.ts` (list peers/devices, register self, revoke).
  - `AccessControlAdapter`: `createScope(scopeId)`, `dropScope(scopeId)`,
    `addMember(scopeId, email, role)`, `removeMember(scopeId, memberId)`,
    `setMemberRole(scopeId, memberId, role)`, `listMembers(scopeId)`,
    `resolveBinding(scopeId): SyncProviderBinding | undefined`.
  - `KeyDeliveryAdapter`: shape after the escrow pipeline surface in
    `src/lib/cloud/cloudClient.ts` re-exports (`createCloudEncryption`,
    `unlockCloudEncryption`, `recoverCloudEncryption`, `cloudEscrowPresence`).
- Steps:
  1. Write the failing test `src/lib/syncProviders/types.test.ts`: type-level assertions via
    `expectTypeOf` (Vitest) that a minimal Dexie-Cloud-shaped literal and a WebRTC-shaped
    literal (realtime+discovery only) satisfy `SyncProvider`, plus runtime tests for a small
    `hasCapability(provider, name)` type-guard helper exported from `types.ts`.
  2. Implement `src/lib/syncProviders/types.ts` (types + `hasCapability` arrow-function
    guard). No imports from cloud/yjs/addon; the only allowed cross-import is the
    `SyncTransport` type from `src/lib/collab/types.ts`.
- Verify: `npx vitest run src/lib/syncProviders && npm run typecheck && npx eslint src/lib/syncProviders/* --max-warnings=0`
- Commit: `feat(sync-provider): add capability contracts`

### S1.T2 - SyncCoordinator registry
- Goal: `src/lib/syncProviders/coordinator.ts` exports `createSyncCoordinator(options:
  WriterSyncOptions)` returning a coordinator that: lists providers, resolves a provider by
  id, resolves the first provider offering a given capability, rejects duplicate provider ids
  via `invariant()`, and resolves a `SyncProviderBinding` for a scope by delegating to
  providers' `accessControl.resolveBinding` (first enabled binding wins). Pure, stateless
  beyond its constructor input; no module-level mutable state.
- Code refs: `src/lib/syncProviders/types.ts` (S1.T1); `invariant` from `src/lib/invariant.ts`.
- Steps:
  1. Write the failing test `src/lib/syncProviders/coordinator.test.ts`: registration,
     duplicate-id rejection, capability lookup across multiple fake providers, binding
     resolution precedence, empty-providers edge case.
  2. Implement `coordinator.ts` (arrow functions, options object, ≤ 60-line functions).
- Verify: `npx vitest run src/lib/syncProviders && npm run typecheck && npx eslint src/lib/syncProviders/* --max-warnings=0`
- Commit: `feat(sync-provider): add SyncCoordinator registry`

## Stage 2 - Dexie Cloud provider adapter
Goal: Dexie Cloud presented as the first `SyncProvider` (capabilities: `frameSync`,
`keyDelivery` now; `accessControl` filled by Stage 4) with zero behaviour change — existing
cloud tests must pass unmodified except where noted. Stage gate: full unit suite +
`npm run test:e2e` (cloud specs) green.

### S2.T1 - Dexie Cloud SyncProvider adapter
- Goal: `src/lib/cloud/dexieCloudProvider.ts` exports `createDexieCloudProvider(): SyncProvider`
  with `id: 'dexie-cloud'`, `frameSync` delegating to the existing facade functions
  (`requestCloudSync`, `cloudSyncState`, `cloudSyncComplete`, `startCloudSession`), and
  `keyDelivery` delegating to the escrow surface. Pure delegation — no logic moves, no new
  behaviour. (Adapter lives beside the cloud subsystem so `src/lib/syncProviders/` core stays
  concrete-free; one service per file.)
- Code refs: `src/lib/cloud/cloudClient.ts` (`startCloudSession`, `requestCloudSync`,
  `cloudSyncState`, `cloudSyncComplete`, escrow re-exports); `src/lib/syncProviders/types.ts`.
- Steps:
  1. Write the failing test `src/lib/cloud/dexieCloudProvider.test.ts`: provider satisfies
     `SyncProvider`, `hasCapability` reports frameSync/keyDelivery and (for now) no
     accessControl/realtime/discovery, and delegation calls the underlying facade functions
     (typed Vitest mocks of `cloudClient` module, no `any`).
  2. Implement the adapter.
- Verify: `npx vitest run src/lib/cloud/dexieCloudProvider.test.ts && npm run typecheck && npx eslint src/lib/cloud/dexieCloudProvider.ts src/lib/cloud/dexieCloudProvider.test.ts --max-warnings=0`
- Commit: `feat(sync-provider): add dexie cloud adapter`

### S2.T2 - Boot through the coordinator
- Goal: session boot composes providers through `createSyncCoordinator` while observable
  behaviour is unchanged (needs S2.T1). `useAppBoot` still calls one entry point;
  `startCloudSession` internals and boot order are untouched — the coordinator wraps, it does
  not re-implement. `cloudClient.test.ts` assertions stay green unmodified.
- Code refs: `src/lib/cloud/cloudClient.ts::startCloudSession`, `src/hooks/useAppBoot.ts`,
  `src/lib/syncProviders/coordinator.ts`, `src/lib/cloud/dexieCloudProvider.ts`.
- Steps:
  1. Extend `src/lib/cloud/cloudClient.test.ts` (add, don't weaken) with a failing test:
     the session boot registers the dexie-cloud provider with a coordinator and starts it via
     its `frameSync` capability; boot order assertions unchanged.
  2. Implement: build the coordinator with `providers: [createDexieCloudProvider()]` inside
     the cloud session assembly; keep `startCloudSession()`'s public signature and stop-fn
     contract identical.
- Verify: `npx vitest run src/lib/cloud && npm run typecheck` — then stage gate: `npm run lint && npm run test:run && npm run test:e2e`
- Commit: `refactor(cloud): boot session through coordinator`

## Stage 2b - UI through the provider
Goal: no component or hook imports the cloud facade; every cloud-facing surface consumes a
capability from the coordinator instead. Added 2026-07-18 on user direction. 20 files import
`cloudClient` today. Each task migrates one capability *together with* its consumers, so no
adapter method ever lands uncovered. Behaviour must not change: these are live cloud-beta
surfaces with e2e specs, and every existing cloud spec must stay green unmodified.

Two capabilities do not exist yet and must be designed as part of their task, not bolted on:
sign-in/out (no `account` capability) and mount reconciliation (`reconcileDocForMount`).
Whether `isCloudSyncEnabled` and `isCloudKeyError` become capabilities or move to a neutral
module is an open question — see Questions.

### S2b.T1 - Coordinator context and key delivery
- Goal: React reaches the coordinator without importing a concrete provider, and the three
  key-delivery surfaces migrate onto it. Restores the `keyDelivery` capability removed in
  b9972a3, this time with callers.
- Code refs: `src/lib/writerSync/startWriterSync.ts` (splits: build the coordinator, then
  start it), `src/lib/cloud/dexieCloudProvider.ts`, `src/components/settings/tabs/cloud/`
  — `PassphraseSetupDialog.tsx` L42 (`onCreate`), `PassphraseUnlockDialog.tsx` L50-51
  (`onUnlock`/`onRecover`), `CloudSectionPanel.tsx` L42 (`cloudEscrowPresence`). All three
  already inject their dependencies, so migration swaps the defaults.
- Steps:
  1. Failing tests: a context/hook test proving a component resolves `keyDelivery` from the
     coordinator without importing the facade; extend the three component tests to inject a
     fake provider rather than fake facade functions.
  2. Add the coordinator context and capability hook; wire it at boot beside `startWriterSync`.
  3. Restore `keyDelivery` on the Dexie Cloud adapter and point the three components' default
     props at it.
- Verify: `npx vitest run src/components/settings/tabs/cloud src/lib/writerSync && npm run test:e2e -- cloud` green, then `npm run test:e2e:coverage` — the ratchet must hold with the restored capability now covered.
- Commit: `refactor(cloud): consume key delivery through the provider`

### S2b.T2 - Sync status
- Goal: `CloudSyncStatusRow`, `useCloudPanelState`, `HomeCloudRow` read status from
  `frameSync` instead of `cloudSyncState`/`cloudSyncComplete`.
- Commit: `refactor(cloud): read sync status through the provider`

### S2b.T3 - Device registry
- Goal: `useDeviceList`, `useDeviceSlots`, `useDeviceRemoval` consume a `discovery`
  implementation (declared but unimplemented) rather than `deviceRegistry` and friends.
- Commit: `refactor(cloud): manage devices through the provider`

### S2b.T4 - Account capability
- Goal: design an `account` capability (sign in, sign out, current user, account-pull state)
  and migrate `CloudLoginContent`, `CloudLoginDialog`, `CloudSection`, the keyless sections.
- Commit: `feat(sync-provider): add the account capability`

### S2b.T5 - Mount reconciliation
- Goal: model `reconcileDocForMount` as a capability and migrate `useDocCrdtReady`.
- Commit: `feat(sync-provider): add mount reconciliation`

## Stage 3 - Realm access-control schema
Goal: the access-control tables are present, correctly classified, and pinned by tests.

**Corrected 2026-07-18 after reading the addon.** The original plan — declare
`realms`/`members`/`roles` via a `version(2)` chain — was wrong, and would have broken the
build. `overrideParseStoresSpec` in dexie-cloud-addon merges its own `DEXIE_CLOUD_SCHEMA`
(`realms: '@realmId'`, `members: '@id, [userId+realmId], [email+realmId], realmId'`,
`roles: '[realmId+name]'`, plus `$jobs`, `$syncState`, `$baseRevs`, `$logins`) into whatever
stores are declared, and **throws** if the app redeclares one with a different primary key —
which the runbook's guessed `members: '@id,[realmId+email]'` would have done. Verified by
probe: a cloud-enabled instance already reports `realms`, `members`, `roles` at `verno === 1`.

So there is **no schema change to make**: no `version(2)`, no `STORES` edit, no migration.
The tables are also already correctly classified — absent from `SYNCED_TABLES` (so the
encryption middleware leaves them in the clear, which the server needs for access control)
and absent from `UNSYNCED` (so they replicate).

### S3.T1 - Pin the addon-managed access-control tables
- Goal: regression tests proving the tables arrive on cloud instances, stay off plain ones,
  and are never enveloped. No production change.
- Code refs: `src/db/buildDb.test.ts`, `src/lib/cloud/crypto/tableRules.ts` (`SYNCED_TABLES`
  stays 10), `node_modules/dexie-cloud-addon/dist/modern/dexie-cloud-addon.js`
  (`DEXIE_CLOUD_SCHEMA`, `overrideParseStoresSpec`).
- Steps:
  1. Add tests to `buildDb.test.ts`: a cloud instance contains `realms`/`members`/`roles` and
     stays at `verno === 1`; a plain instance contains none of them; a realm row round-trips
     without `CIPHER_FIELD`.
- Verify: `npx vitest run src/db src/lib/cloud/crypto && npm run typecheck && npm run lint`
- Commit: `test(db): pin the addon-managed realm tables`

### S3.T2 - Typed realm accessors — nothing to do
- **Resolved 2026-07-18: no work, no dependency.** `dexie-cloud-addon` ships
  `extend-dexie-interface.d.ts`, which does `declare module 'dexie'` and adds `realms`,
  `members` and `roles` to the `Dexie` interface — with correct insert types and `roles`
  keyed on the compound `[string, string]`. The augmentation reaches every `Dexie` subclass
  as soon as the addon's types are in the program, which they are via `buildDb.ts`.
- `db.realms` / `db.members` / `db.roles` are therefore already typed on `LoremDB`; declaring
  them again is redundant and gets the `roles` key type wrong. Verified by probe.
- The earlier claim that this needed `dexie-cloud-common` as a direct dependency was wrong —
  it came from checking the package's exports without checking for a module augmentation.

## Stage 4 - realmId plumbing + access-control operations
Goal: rows can live in a custom realm; a space can be moved into (and back out of) its own
realm; members/roles are manageable through the facade. No UI, no invites, single-writer
semantics preserved (see Guardrails). Stage gate at S4.T5.

### S4.T1 - Carry realmId on synced row types
- Goal: every synced content row type accepts an optional `realmId?: string` (and the
  matching `owner?: string` stays untouched/implicit), typed in the schema; non-indexed, so
  no STORES or version change. Encryption envelope and archive round-trips preserve it.
- Code refs: `src/db/schema.ts` (the 10 synced row interfaces: Space, Section, Doc, Note,
  NoteAttachment, Annotation, Citation, Connection, Revision, HighlightPalette),
  `src/lib/cloud/crypto/tableRules.ts::plaintextFieldsFor` (`realmId` already in
  `CLOUD_RESERVED`), `src/lib/cloud/crypto/envelope.ts::sealRow` (already preserves
  realmId/owner pass-through), `src/lib/format/parseSpaceArchive.ts`,
  `src/lib/backup/buildSpaceMarkdownZip.ts` (both already reference realm handling — verify
  their treatment of the field on export/import and pin it with a test).
- Steps:
  1. Failing tests: extend `src/lib/cloud/crypto/tableRules.test.ts` /
     `middleware.test.ts` with an assertion that a row carrying `realmId` seals with
     `realmId` in plaintext and round-trips intact; extend the archive tests to pin
     export/import behaviour for a realm-stamped space.
  2. Add `realmId?: string` to the 10 interfaces in `src/db/schema.ts`.
  3. Verify no constructor/repository requires changes (field is optional); check
     `src/db/seed.ts::createSpaceFromTemplate` and `src/lib/docs/docRepository.ts::createDoc`
     compile untouched.
- Verify: `npx vitest run src/db src/lib/cloud/crypto src/lib/format src/lib/backup && npm run typecheck`
- Commit: `feat(db): carry realmId on synced row types`

### S4.T2 - Space realm share/unshare operations
- Goal: `src/lib/cloud/spaceRealm.ts` exports `createSpaceRealm(spaceId)` — creates a realm
  row (addon-minted `@realmId`), then in one Dexie transaction stamps that `realmId` onto the
  space row and every child row — and `dropSpaceRealm(spaceId)` — moves all rows back to the
  private realm (clears `realmId`) and deletes the realm/members/roles rows. Needs S3.T1 and
  S4.T1. Single write path respected: doc-row stamping goes through a dedicated repository
  entry, not ad-hoc `db.docs` writes.
- Code refs: the canonical space fan-out in `src/lib/space/deleteSpaceCascade.ts`
  (spaceId-children: sections, docs, notes, noteAttachments, citations, connections,
  palettes; docId-descendants: annotations, revisions — `docUpdates`/`meta` are local-only
  and are NOT realm-stamped); `src/lib/docs/docRepository.ts` (docs writes);
  `src/lib/ids.ts::newId` (NOT used for the realm id — addon `@` id); `src/db/seed.ts`.
- Steps:
  1. Failing test `src/lib/cloud/spaceRealm.test.ts` (fake-indexeddb, cloud-enabled
     `buildDb` instance as in `buildDb.test.ts`): share stamps every synced child row and the
     space row with the realm id; unshare restores private-realm state and removes
     realm/member rows; local-only tables untouched; idempotence (sharing twice is a no-op or
     invariant, decide and pin).
  2. Implement `spaceRealm.ts` (one service per file; reuse/extract the child-table map from
     `deleteSpaceCascade.ts` — if extraction requires editing that file beyond compliance, a
     separate `refactor:` commit precedes this one).
  3. If the shared fan-out map is extracted: `refactor(space): extract space child-table map`
     lands first, behaviour unchanged, existing cascade tests green.
- Verify: `npx vitest run src/lib/cloud/spaceRealm.test.ts src/lib/space && npm run typecheck`
- Commit: `feat(cloud): add space realm share/unshare ops`

### S4.T3 - Realm membership operations
- Goal: `src/lib/cloud/realmMembers.ts` exports `addSpaceMember(spaceId, email, role)`,
  `removeSpaceMember(spaceId, memberId)`, `setSpaceMemberRole(spaceId, memberId, role)`,
  `listSpaceMembers(spaceId)` over the `members`/`roles` tables, plus seeding of the two
  fixed roles (`editor`, `viewer`; owner is the realm owner) at share time. Needs S4.T2.
  Adding a member row grants access when Dexie Cloud syncs it — the invite flow/UI stays out
  (Guardrail); these are library operations only.
- Code refs: `src/db/LoremDB.ts` (members/roles tables from S3.T1),
  `src/lib/cloud/spaceRealm.ts` (S4.T2), addon member/role row shapes
  (`dexie-cloud-addon` typings).
- Steps:
  1. Failing test `src/lib/cloud/realmMembers.test.ts`: add/list/set-role/remove round-trip
     against a cloud-enabled test db; invariant rejection for an unshared space; roles seeded
     exactly once.
  2. Implement `realmMembers.ts`.
- Verify: `npx vitest run src/lib/cloud/realmMembers.test.ts && npm run typecheck`
- Commit: `feat(cloud): manage realm members and roles`

### S4.T4 - Wire accessControl capability + facade exports
- Goal: the dexie-cloud provider gains its `accessControl` capability (delegating to
  `spaceRealm.ts` + `realmMembers.ts`, with `resolveBinding(spaceId)` derived from the space
  row's `realmId` — a space with a realmId is bound `{ scopeId: spaceId, providerId:
  'dexie-cloud', externalScopeId: realmId, enabled: true }`); `cloudClient.ts` re-exports the
  new operations so UI keeps a single import point. Needs S4.T2, S4.T3.
- Code refs: `src/lib/cloud/dexieCloudProvider.ts` (S2.T1),
  `src/lib/syncProviders/types.ts::AccessControlAdapter`, `src/lib/cloud/cloudClient.ts`.
- Steps:
  1. Failing tests: extend `dexieCloudProvider.test.ts` (capability present, delegation,
     binding resolution for shared/unshared spaces) and `cloudClient.test.ts` (facade
     re-exports exist).
  2. Implement capability wiring + facade re-exports.
- Verify: `npx vitest run src/lib/cloud src/lib/syncProviders && npm run typecheck`
- Commit: `feat(cloud): expose access control via facade`

### S4.T5 - E2E coverage for realm plumbing
- Goal: Playwright spec `e2e/cloud-realms.spec.ts` exercising the share → member → unshare
  library flow in a real browser context, following the existing cloud e2e patterns
  (`e2e/cloud-sync.spec.ts` boot params, `window.db` dev/e2e bridge). Coverage: aim ≥ 95%
  local for the new `src/lib/syncProviders/**` + new `src/lib/cloud/*.ts` files; global
  ratchet must not regress. If ≥ 95% is genuinely unreachable headlessly, STOP and report
  exact files/percentages/reasons — never below 85%, never lower a baseline.
- Code refs: `e2e/cloud-sync.spec.ts`, `e2e/multi-tab-sync.spec.ts` (IndexedDB assertions
  pattern), `playwright.config.ts`, `coverage-baseline.json` (raise-only),
  `scripts/coverage-ratchet.mjs`.
- Steps:
  1. Write the spec: drive share/unshare via the exposed facade (window bridge as in
     existing cloud specs), assert realm rows and realm-stamped children directly from
     IndexedDB; use auto-waiting assertions only, no `waitForTimeout`, no `{ force: true }`,
     stable locators, `ControlOrMeta` for any chords.
  2. Run `npm run test:e2e` then `npm run test:e2e:coverage`; commit an increased
     `coverage-baseline.json` only if the run raises floors.
- Verify: `npm run test:e2e && npm run test:e2e:coverage` pass; report local % per new file.
- Commit: `test(e2e): cover realm sharing flows`

## Stage 5 - Documentation and specification
Goal: docs/spec tell the truth about the new layer in the same PR (AGENTS.md requirement).

### S5.T1 - Update architecture, cloud-sync design, and spec
- Goal: `docs/architecture.md` documents the `SyncProvider`/`SyncCoordinator` seam (add it to
  the §9 canonical-boundaries table; update §2 layer map; §4 note that realms/members/roles
  are addon-managed plaintext and docUpdates stays local-only); `docs/cloud-sync-beta.md`
  gains a realm-groundwork section (tables, realmId stamping, plaintext-by-design, and the
  still-open server-side erase-gate blocker for multi-writer); `docs/technical-specification.md`
  §4.9/§4.11/§8 updated (known-gaps bullets for sharing move from "missing" to "library
  groundwork present, UI pending"; §9 glossary gains realm/member terms). British English.
  No Help Center article: the cloud beta is deliberately undocumented in Help while
  invite-only, and no new `featureArea` is registered (registry coverage test stays green).
- Code refs: `docs/architecture.md` §2/§4/§9, `docs/cloud-sync-beta.md` §5,
  `docs/technical-specification.md` §4.9/§4.11/§8/§9, `src/lib/help/registry.test.ts`
  (must stay green untouched).
- Steps:
  1. Update the three documents; keep scope to touched sections.
  2. Run the full gates one final time: `npm run lint && npm run typecheck && npm run test:run && npm run test:e2e && npm run test:e2e:coverage`.
- Verify: all gates green; `registry.test.ts` untouched and green.
- Commit: `docs(sync): record SyncProvider and realm design`

## Questions
(planner-seeded; answers fold into tasks — executor appends new ones here)

1. **Server-side erase gate (blocker for multi-writer):** docs/cloud-sync-beta.md §5.1
   requires realm-owner-gated erase/re-key server-side before a second writer joins a realm.
   That is Dexie Cloud server configuration/policy work, not client code. Who owns it, and
   does a follow-up runbook cover it? Until answered, no invite UI and no second writer.
2. **Sharing & members UI activation** (Space Settings coming-soon group,
   `src/i18n/locales/en/screens.json` ~L595-700, ~40 locales): follow-up runbook after the
   erase gate lands? (Ships with help article, a11y tests, stories, i18n.)
3. **Package extraction** to `@dopamind/writer-sync/*`: direction only for now; extraction
   would need a workspace/monorepo decision. Confirm deferral.
4. **frameSync implementation** (encrypted `docUpdates` replication) would supersede the
   whole-doc LWW reconciler — a recorded open decision. This runbook ships the interface
   only. Confirm the implementation stays out of scope.

## Review findings
(reviewer appends here; executor fixes and reports)
