# Architecture

> Covers the collaborative-editing and encrypted-cloud architecture used as this work's basis.
> Update it whenever structural decisions change.

---

## 1. Application boot and route structure

### Boot sequence (`src/App.tsx` → `useAppBoot`)

```
main.tsx
  └── <App />
        └── useAppBoot()
              1. hydrateCloudDevice()         — load persisted device key ring before any DB read
              2. startCloudReconciler()        — watch sync state; reconcile pulled doc bodies
              3. startEscrowReconciler()       — watch sign-in; publish/compare escrow
              4. startKeylessLockMonitor()     — lock writes while signed-in without a key
              5. applyDevBootParams()          — DEV/E2E only: force mismatch/keyless signals
              → setReady(true)
        └── <ThemeProvider>
              └── <A11yPreferenceProvider>
                    └── <SyncScheduler />     — folder-sync ticker (local FS, not cloud)
                    └── <RouterProvider />    — React Router
```

Steps 2–4 are no-ops on a plain (non-cloud) database. The router mounts only after
`ready` is true; a boot failure shows `<BootErrorScreen>`.

### Routes (`src/lib/routes.ts`)

| Path | Screen | Component |
|---|---|---|
| `/` | Home | `HomeScreen` |
| `/about` | About | `AboutScreen` |
| `/settings` | Settings | `SettingsScreen` |
| `/new` | Templates | `TemplatesScreen` |
| `/s/:spaceId` | Space write | `WriteScreen` |
| `/s/:spaceId/settings` | Space settings | `SpaceSettingsScreen` |
| `/s/:spaceId/d/:docId` | Document write | `WriteScreen` |
| `/s/:spaceId/d/:docId/focus` | Focus mode | `FocusScreen` |
| `/s/:spaceId/d/:docId/read` | Read mode | `ReadScreen` |
| `/s/:spaceId/d/:docId/split` | Split view | `SplitScreen` |
| `/s/:spaceId/brain-space` | Brain Space | `BrainSpaceScreen` |
| `/s/:spaceId/citations` | Citations | `CitationsScreen` |
| `/help` | Help | `HelpScreen` |
| `/help/:slug` | Help article | `HelpScreen` |

Router is hash-based by default; set `VITE_ROUTER=browser` for path-based (used in
production preview deployments).

---

## 2. Module layers and dependency direction

```
Screens / Components (src/screens/, src/components/)
   │   may import ↓
Hooks (src/hooks/)
   │   may import ↓
Lib (src/lib/)        ← domain logic, pure functions, interfaces
   │   may import ↓
DB (src/db/)          ← Dexie schema, buildDb, LoremDB
   │   may import ↓
External packages     (dexie, yjs, lexical, zustand, …)
```

**Invariants:**
- `src/lib/collab/types.ts` imports **nothing** from `yjs` — it is the engine-agnostic seam.
- `src/lib/syncProviders/types.ts` is the provider-neutral sync seam — it imports nothing
  from `src/lib/cloud/**`, `dexie-cloud-addon`, or `yjs`.
- Components and hooks reach sync behaviour through the `SyncProvider` capability adapter
  (`useSyncCapability`), **not** through `src/lib/cloud/cloudClient.ts`. The facade hides the
  `db.cloud` subsystem's complexity but not its identity — it exposes Dexie-Cloud-shaped
  types — so UI written against it is UI coupled to one backend.
- `src/lib/cloud/cloudClient.ts` remains the only module that touches `db.cloud`, and is now
  an implementation detail of the Dexie Cloud adapter.
- `src/lib/docs/docRepository.ts` is the single write path for the `docs` table.
- `src/editor/EditorFacade.tsx` is the public boundary for the editor subsystem;
  `WriteSurface.tsx` is its **sole production importer and direct caller**.
- The above are enforced architectural boundaries. Many screens and components import
  `db` and schema types from `src/db/` directly for reads — this is accepted practice.
  The enforced write boundary is `src/lib/docs/docRepository.ts`; the enforced sync boundary
  for UI is the `SyncProvider` capability layer, and `src/lib/cloud/cloudClient.ts` is the
  enforced boundary onto `db.cloud`. Migrating the remaining direct facade importers
  (device registry, sign-in/out) is tracked work — do not add new ones.
- `src/lib/reconcile/` holds **local** CRDT ↔ row-body reconciliation, including the
  mount gate every editor open passes through. It is deliberately *not* a `SyncProvider`
  capability: it must run with zero providers configured (a page closed inside the autosave
  debounce diverges on a purely local device too). The cloud sweep in
  `src/lib/cloud/reconcile.ts` builds on it, never the reverse.

---

## 3. Same-browser collaborative editing (Yjs / BroadcastChannel)

The editor is [Lexical](https://lexical.dev/) with `@lexical/yjs`'s `CollaborationPlugin`.
Every document has a per-tab `YjsProvider` that:

1. Loads the full CRDT update log from `docUpdates` (via `collabStore.loadAll`).
2. Opens a `BroadcastChannelTransport` keyed on `docId` — all tabs in the same browser
   origin share it, giving instant cross-tab presence and update propagation.
3. Sends the y-protocols sync handshake to any peer that is already listening.
4. On each local edit (Yjs `update` event), persists the delta to `docUpdates` and relays it
   to the transport — unless the origin is `sharesStore` (another same-browser tab), in which
   case it relays but skips the redundant persist.
5. Emits the serialised Lexical state as `docs.body` on a ~600 ms debounce (the **dual-write**
   that keeps the read model in step).

`PresenceState` (cursor label, hue, `authorId`, `tabId`) rides the y-protocols awareness
channel over the same transport.

The `ProviderFactory` is built once by `useCollab` (returns `undefined` until the profile
row exists) and passed to `<Editor>` / `<EditorFacade>`. A stable factory is critical —
a fresh instance would remount the entire `CollaborationPlugin`.

### Collaboration call chain

```
useCollab()
  ├── useProfile()              — reads profile row from DB
  └── makeProviderFactory(collabStore, profile, tabId)
        └── (id, yjsDocMap) =>
              createYjsProvider({
                docId: id,
                ydoc,
                store: collabStore,
                transports: [createBroadcastChannelTransport(id)],
                local: toPresence(profile, tabId),
              })
```

---

## 4. Data stores and the CRDT / read-model distinction

### Critical distinction: `docUpdates` vs `docs.body`

| | `docUpdates` | `docs.body` |
|---|---|---|
| **Nature** | Append-only CRDT update log (`DocUpdate[]`, tagged `engine: 'yjs'`, `formatVersion: 1`) | Serialised Lexical JSON string — the **read model** |
| **Written by** | `YjsProvider` (`collabStore.append`) on every edit delta | Editor autosave debounce (`updateDocBody`) |
| **Authoritative for** | Live editing state; what the mounted editor renders | Display outside the editor (read mode, search, revisions, reconciliation snapshots) |
| **Syncs via cloud** | **No** — `docUpdates` is an `UNSYNCED` table; CRDT history is per-device | **Yes** — `docs` syncs field-encrypted |
| **Lost on sign-out** | Yes — the cloud addon clears all tables on logout | Restored on next pull |

The editor always renders from the Y.Doc rebuilt from `docUpdates`. `docs.body` is never
read back into a mounted editor during normal operation — the reconciler handles the cross-device
case (§5).

### Whole-document last-writer-wins (LWW) cross-device reconciliation

Because `docUpdates` does not sync, a body pulled from another device via Dexie Cloud sits
in `docs.body` while the local Y.Doc reflects a different (possibly older) CRDT lineage.
After each transition out of the `pulling` sync phase, `startCloudReconciler` runs
`reconcilePulledDocs`:

1. **Snapshot** the local CRDT (`serializeDocSnapshot`) — the inverse of the seed.
2. **Compare** to `docs.body`. Equal → locally-authored, skip.
3. **Empty log** → CRDT was wiped (e.g. sign-out cleared `docUpdates`). Reseed from body
   without creating a spurious revision.
4. **Autosave lag** → flush the mounted editor (`EditorHandle.flush()`). If the flush wrote
   pending edits, the divergence was lag, not a remote pull — leave the editor untouched.
5. **Genuine divergence** → write a `'pre-sync'` revision of the local (losing) side, then
   call `EditorHandle.restoreBody` (mounted) or reseed (unmounted).

Lossless CRDT-level merge across devices is a recorded open decision for a future stage.

---

## 5. Dexie schema and the encryption invariants

### `LoremDB` tables (`src/db/LoremDB.ts`, `src/db/stores.ts`)

| Table | Key | Role | Syncs? | Encrypted? |
|---|---|---|---|---|
| `spaces` | `id` | Writing project | Yes | Yes |
| `sections` | `id` | Hierarchical doc groups | Yes | Yes |
| `docs` | `id` | Document row + `body` read model | Yes | Yes |
| `docUpdates` | `++id` | CRDT update log | **No** | No |
| `notes` | `id` | Brain Space cards | Yes | Yes |
| `noteAttachments` | `id` | Note image blobs | Yes | Yes |
| `annotations` | `id` | Inline annotations | Yes | Yes |
| `citations` | `id` | BibTeX references | Yes | Yes |
| `connections` | `id` | Note–note edges | Yes | Yes |
| `revisions` | `id` | Version history | Yes | Yes |
| `palettes` | `id` | Highlight colours | Yes | Yes |
| `backups` | `id` | Space archive blobs | **No** | No |
| `settings` | `key` | Global user prefs | **No** | No |
| `meta` | `key` | Internal markers (CRDT seed keys, …) | **No** | No |
| `syncs` | `id` | Folder-sync history | **No** | No |
| `syncConfigs` | `spaceId` | Folder-sync intervals | **No** | No |
| `docInspectorConfigs` | `spaceId` | Inspector toggle state | **No** | No |
| `cloudCrypto` | `id` | Passphrase-wrapped escrow (cloud only) | **Yes** | (is the envelope) |

**Schema invariant:** `STORES` in `src/db/stores.ts` is the single source of truth for
index definitions. `tableRules.ts` derives which fields stay plaintext from it — a field
is plaintext iff it is the primary key, an indexed field, a cloud-reserved field
(`realmId`, `owner`), provider-neutral routing metadata (`accessScopeId`, `mutationId`,
`logicalUpdatedAt` — a provider must route, deduplicate and order without a content
key), or the `$lipsumCipher` envelope itself. Attribution (`createdBy`, `updatedBy`)
is sealed content.

**Encryption invariant:** The `createEncryptionMiddleware` middleware sits above the Dexie
Cloud addon (`level: 10`). Writes are sealed **before** they reach the sync push queue;
reads are opened after. `KeyProvider.current() === null` means no key — the middleware
passes rows through unchanged (keyless pass-through). A `KeylessSignInBlockedError` blocks
sign-in until existing plaintext rows are sealed first (§5.2 of `cloud-sync-beta.md`).

**Table policy:** `src/lib/writerSync/writerTablePolicy.ts` is the single authoritative
classification of every table — replication (`synced-content` / `provider-control` /
`local-only`), encryption (`row-envelope` / `already-wrapped` / `plaintext-control` /
`none`), scope kind (`space` / `document` / `account` / `local`) and whether mutations
enter the operation journal. The previously independent lists all derive from it:
`SYNCED_TABLES` (row-envelope tables, in `tableRules.ts`), `UNSYNCED` (local-only tables,
in `buildDb.ts`) and the realm fan-out sets (`spaceRealm.ts`). `cloudCrypto` is classified
`already-wrapped` — it is the passphrase-wrapped escrow envelope and must not be
re-encrypted by the row middleware; it syncs via the Dexie Cloud addon's own mechanism.
Adding a table without classifying it fails `writerTablePolicy.test.ts`.

**Sticky schema:** Once a device builds the cloud-enabled DB, `buildDb` keeps using it even
if the flag is switched off (guarded by `wasCloudProvisioned()`). The Dexie Cloud addon
raises the native IndexedDB version, so downgrading the schema would drop stores.

---

## 6. Encrypted Dexie Cloud beta

Both gates must be on for the **initial** cloud build:
1. **Build gate** — `VITE_DEXIE_CLOUD_URL` set to a valid `https://` URL.
2. **Device gate** — `?cloud-sync=on` URL param (persisted to `localStorage`).

`buildDb` logic: `cloud = hasCloudEnv() && (readCloudFlag() || wasCloudProvisioned())`.

**Sticky schema:** once a device has provisioned the cloud DB (marked via
`wasCloudProvisioned()`), `buildDb` continues building the cloud-enabled `LoremDB` as
long as the env var is still present — even if the device gate flag is turned off. Opting
out hides the cloud UI but does not change the schema or drop local data. If the env var
is removed, the plain local DB is used (the provisioned marker is ignored without the env).

Before any device is provisioned, with either gate off, zero cloud code paths execute.

Key model (abbreviated — full detail in `docs/cloud-sync-beta.md`):

```
32-byte master secret (CSPRNG)
  ├── HKDF → AES-256-GCM content key (non-extractable CryptoKey)
  ├── HKDF → 16-byte fingerprint (key identity tag, public)
  └── PBKDF2 (passphrase, ≥ 800 000 iter) → KEK → AES-256-GCM wrap → escrow
```

The escrow is held on-device until sign-in confirms the account has no escrow, then
published as the single `cloudCrypto['v1']` row via an **add-only** path (never
overwrites a differing fingerprint).

---

## 7. Local/folder sync distinction

Folder sync (`src/lib/sync/`, `SyncScheduler`) is an entirely separate mechanism from
Dexie Cloud sync:

| | Folder sync | Cloud (Dexie Cloud) |
|---|---|---|
| Transport | File System Access API (local disk) | HTTPS/WebSocket to Dexie Cloud |
| Scope | Per-space versioned ZIP archives to a chosen folder | Full content replication across devices |
| Output | `latest.zip` (always overwritten) + timestamped archive; each ZIP includes Markdown projection + per-record JSON (`records/`) + manifest | — |
| Trigger | Scheduled interval per space + manual | Continuous once signed in |
| Encryption | No | Yes (field-level AES-256-GCM) |
| Tables | Space content only (no cloud-only tables) | Syncs all `SYNCED_TABLES` |

---

## 8. Save and load flows

### Save (write path)

Two independent writes on each edit — **immediate CRDT write** and **debounced
read-model write**:

```
User edits in LexicalEditor
  → Yjs update event (immediate)
    → YjsProvider.persistAndRelayUpdate()
        → collabStore.append(docId, delta)           [docUpdates row — CRDT log]
        → BroadcastChannelTransport.send(delta)      [other tabs]

  → Lexical registerUpdateListener in AutosavePlugin (debounced ~600 ms)
    → AutosavePlugin.flushPendingSave()
      → EditorPlugins (hosts AutosavePlugin; receives onChange from WriteSurface)
        → WriteSurface.handleChange(serialized)
          → updateDocBody(docId, serialized)         [docs.body — read model]
              → db.docs.update(docId, { body, wordCount, updatedAt })
```

The CRDT append starts immediately; the read-model body write arrives
independently ~600 ms later (or on unmount/flush).

### Load (read path)

```
Route mounts WriteScreen / ReadScreen / SplitScreen
  (FocusScreen redirects to Write with ?focus=1)
  → useCollab() → CollabConfig (providerFactory, username, cursorColor)
  → useDocCrdtReady(docId)       — ensures docUpdates log is not empty
      → collabStore.reseedIfEmpty(docId, seedFromLexicalJson(doc.body))
  → <EditorFacade> mounts with providerFactory
      → CollaborationPlugin calls providerFactory(docId, yjsDocMap)
        → createYjsProvider(...)
          → collabStore.loadAll(docId)              [reads all docUpdates]
          → Y.applyUpdate(ydoc, mergedUpdates)      [rebuilds Y.Doc]
          → transport.send(syncRequest)             [handshake with other tabs]
          → setTimeout(markSynced, 300)             [solo fallback]
```

---

## 9. Canonical public boundaries

| Symbol / File | Role | Consumers |
|---|---|---|
| `src/lib/syncProviders/types.ts` | The capability vocabulary: `SyncProvider` with optional `frameSync` / `realtime` / `discovery` / `accessControl` / `keyDelivery`, plus `SyncProviderBinding`. Backend-neutral; imports nothing from the cloud subsystem | `createSyncCoordinator`, provider adapters |
| `src/lib/writerSync/syncCoordinatorContext.ts` | How UI reaches sync: `useSyncCapability(name)` resolves one capability from the coordinator, or reports its absence | Cloud settings components, boot |
| `src/lib/writerSync/createWriterSyncCoordinator.ts` | Composition root — the only module that knows both the coordinator and the concrete providers | `App.tsx` |
| `src/lib/cloud/dexieCloudProvider.ts` | Dexie Cloud as a `SyncProvider`; maps the addon's seven sync phases and its escrow union onto the neutral vocabulary | The composition root |
| `src/lib/cloud/cloudClient.ts` | Sole module touching `db.cloud`; an implementation detail of the adapter, **not** a UI import | `dexieCloudProvider.ts`, cloud subsystem internals |
| `src/lib/reconcile/index.ts` | Local CRDT ↔ row-body reconciliation: `reconcileDocForMount` (the mount gate, runs with or without any provider) and the shared `applyPulledBody` primitive | `useDocCrdtReady`, `src/lib/cloud/reconcile.ts` |
| `src/lib/docs/docRepository.ts` | Single write path for `docs` table (`createDoc`, `updateDocBody`, `renameDoc`, `seedDocCrdt`, …) | Hooks, import/restore flows |
| `src/lib/collab/types.ts` | Engine-agnostic interfaces (`SyncTransport`, `CollabStore`, `PresenceState`) — imports nothing from `yjs` | `YjsProvider`, `DexieCollabStore`, `BroadcastChannelTransport` |
| `src/editor/EditorFacade.tsx` | Public boundary for the editor: accepts `EditorProps` (`docId`, `providerFactory`, `mode`, `onChange`, …) and renders `<LexicalEditor>` | `WriteSurface.tsx` is the **sole direct importer**; `Write`, `Read`, `Split` screens use it via `WriteSurface`; `FocusScreen` redirects to the Write route with `?focus=1` |

---

## 10. Testing map

| Layer | Test type | Files |
|---|---|---|
| CRDT / collab | Unit (Vitest) | `src/lib/collab/**/*.test.ts` |
| DB / schema | Unit | `src/db/**/*.test.ts` |
| Cloud crypto | Unit — P1–P6 middleware spike | `src/lib/cloud/crypto/middleware.test.ts` |
| Local reconcile | Unit | `src/lib/reconcile/*.test.ts` |
| Cloud reconcile | Unit | `src/lib/cloud/reconcile.test.ts`, `escrowReconcile.test.ts` |
| Editor | Unit | `src/editor/**/*.test.{ts,tsx}` |
| Hooks | Unit | `src/hooks/**/*.test.{ts,tsx}` |
| Stores | Unit | `src/store/**/*.test.ts` |
| Theme / a11y | Unit + snapshot | `src/theme/**/*.test.ts` |
| E2E — collab | Playwright | `e2e/multi-tab-sync.spec.ts`, `e2e/cloud-crdt-recovery.spec.ts`, `e2e/cloud-sync.spec.ts` |
| E2E — editor | Playwright | `e2e/editor.spec.ts`, `e2e/persistence.spec.ts` |
| E2E — a11y | Playwright | `e2e/a11y-axe.spec.ts`, `e2e/accessibility-*.spec.ts` |

---

## 11. Authoritative documentation

| Document | Content |
|---|---|
| `docs/architecture.md` (this file) | Structural overview — boot, layers, data flows |
| `docs/cloud-sync-beta.md` | Full key model, encryption middleware, escrow reconciliation, LWW reconciliation, CSP |
| `docs/technical-specification.md` | Feature spec derived from the test suite |
| `docs/design-system.md` | UI tokens, component catalogue, accessibility layer |
| `AGENTS.md` | Universal bootstrap and skill router for agents |
| `CODING_STANDARDS.md` | NASA/JPL Power-of-Ten rules for this codebase |
