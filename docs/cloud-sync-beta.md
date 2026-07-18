# Encrypted cloud sync — beta design note

> Status: **invite-only beta, hidden by default.** This note is the design record for
> the encrypted cloud-sync feature. It deliberately has **no Help Center article** while
> the beta is invite-only (Help content is public and would advertise the feature); add
> the article when the feature ships openly and remove this paragraph.

## 1. What it is, and the two gates

Cloud sync replicates a space's content across a user's devices through
[Dexie Cloud](https://dexie.org/cloud/), with **all content field-encrypted on the
client before it leaves the device**. The server stores ciphertext; it never receives
plaintext note or document bodies.

The feature is inert unless **both** activation gates are on:

1. **Build gate** — `VITE_DEXIE_CLOUD_URL` must be a valid `https://` URL
   (`src/lib/cloud/env.ts`). Ordinary production builds omit the var, so the cloud code
   path is never constructed.
2. **Device gate** — a per-browser opt-in flag (`?cloud-sync=on`, persisted to
   `localStorage` under `lipsum-cloud-sync`; `src/lib/cloud/flag.ts`).

`isCloudSyncEnabled()` is `hasCloudEnv() && readCloudFlag()`. With either gate off there
are **zero** cloud code paths, zero cloud UI, and the IndexedDB schema is identical to
the pre-cloud app.

### Sticky schema (opt-out never destroys data)

Once a device has built the cloud database, `buildDb` keeps using it even if the flag is
later switched off (a `lipsum-cloud-provisioned` marker; `wasCloudProvisioned()`). This
is a **data-safety** decision, not a convenience: the Dexie Cloud addon raises the native
IndexedDB version, so a later *plain*-Dexie reopen of the same database cannot reconcile
the schema and would drop the object stores. Opting out therefore **hides the feature**
but never erases local content. (Verified empirically — see the toggle test in
`src/db/buildDb.test.ts`.)

## 2. Key model

```
32-byte master secret  (CSPRNG, never persisted in the clear, never leaves the device)
      │
      ├── HKDF-SHA-256  (info "lipsum-content-v1")  ──▶  AES-256-GCM content key
      │                                                  (non-extractable CryptoKey,
      │                                                   used to seal every row)
      │
      ├── HKDF-SHA-256  (info "lipsum-keycheck-v1") ──▶  16-byte fingerprint
      │                                                  (public, one-way key tag)
      │
      └── PBKDF2-SHA-512 (passphrase, calibrated ≥ 800 000 iterations)
                │
                ▼
          KEK ── AES-256-GCM wrap ──▶  escrow (held on device, published on reconcile)
```

- **Content key** — derived from the master via HKDF; a non-extractable
  `AES-256-GCM` `CryptoKey`. There is no `exportKey` call anywhere; raw key bytes never
  exist outside the WebCrypto boundary except as the ciphertext of an escrow record.
- **Fingerprint** — a 16-byte, one-way HKDF tag of the master under a *separate* info
  string, so it reveals nothing about the content key. Two devices derive the same
  fingerprint iff they hold the same master, and it never runs backwards to the secret —
  so it rides on the escrow and the device ring and is compared in the clear to tell
  whether a device's key is the account's (see §5.1).
- **Escrow** (`EscrowRecord`, `src/lib/cloud/crypto/keys.ts`) — the master secret wrapped
  under a passphrase-derived KEK (PBKDF2-SHA-512, iteration count calibrated to ~1 s on
  the setup device, floored at 800 000). At setup it is **held on the device** (the
  never-synced keystore), not written to `cloudCrypto`; reconciliation publishes it as the
  single `cloudCrypto` row only once sign-in proves the account has no escrow of its own
  (§5.1). Holding it back is what makes publication add-only — the sync queue can never
  race a local escrow over the account's and clobber the key. Once published it **syncs**,
  so a second device recovers by re-entering the passphrase; safe to sync because it is
  already ciphertext gated by the passphrase. The row id is `#v1` — Dexie Cloud's
  **private-singleton** form (rewritten to `#v1:<userId>` on the wire), so each account
  owns its own escrow row in its private realm. A bare id would be one global object
  shared across every account in the database: the first account would claim it and every
  other account's escrow would be silently rejected server-side, never reaching that
  account's other devices.
- **Recovery code** (`src/lib/cloud/crypto/recoveryCode.ts`) — the raw master secret plus
  a checksum byte, rendered in Crockford base32, grouped into 8-character blocks. Shown
  **exactly once** at setup and never stored. It is the only way back if every device
  forgets the passphrase.

### Why not…

- **Plain Dexie Cloud** (server-visible content) — rejected on the product privacy ethos:
  the server operator must not be able to read user writing.
- **`dexie-encrypted`** — rejected: unmaintained, and it relies on synchronous NaCl,
  which we did not want to adopt for a new privacy-critical path.
- **Argon2id** for the KEK — rejected: the available implementations are WASM, which we
  will not add to the bundle/CSP surface. PBKDF2-SHA-512 with a high, calibrated
  iteration count is the WebCrypto-native compromise.
- **Dynamic import of the addon** — rejected: it would make `db` a promise and ripple
  through every consumer. The addon is imported statically (accepted bundle cost, noted
  here as the trade-off) and passed per-instance via the `addons` option, never through
  the global `Dexie.addons`.

## 3. The cipher envelope

Each encrypted row keeps its primary key and indexed fields in the clear (they must be
queryable) and moves **every other top-level field** into one `$lipsumCipher` envelope
(`src/lib/cloud/crypto/envelope.ts`):

```
CipherEnvelope { v: 1, epoch, iv: base64 string, data: base64 string }
```

- **Algorithm** — AES-256-GCM, a fresh 12-byte random IV per seal.
- **AAD (row binding)** — `lipsum:1:<epoch>:<table>:<primaryKey>`. Because the table,
  primary key and epoch are authenticated, a ciphertext moved to another row or table
  fails authentication (`EnvelopeIntegrityError`) instead of silently decrypting.
- **Payload** — the secret fields are JSON-serialised with a tagged encoding so
  `Uint8Array` and `Blob` values round-trip; function values are rejected.
- **Inline base64, never binary** — `iv` and `data` are base64 **strings**, not
  `Uint8Array`. Dexie Cloud auto-offloads any binary value ≥ 4 KB to blob storage,
  replacing it on the wire with a `{_bt,ref,size}` reference the receiver resolves
  asynchronously. That blob lifecycle is incompatible with this middleware (which sits
  above the addon's blob-resolve layer): an unresolved ref cannot be decrypted, and the
  addon's blob save-back re-enters the middleware and corrupts the write — dropping large
  docs on the receiving device and looping downloads. Keeping the ciphertext an inline
  string sidesteps the binary-offload path; the paired `largeStringThreshold: Infinity`
  cloud config (`src/db/buildDb.ts`) sidesteps the large-string offload path. A stray
  non-string `iv`/`data` reaching decrypt raises `MalformedEnvelopeError` (distinct from
  `EnvelopeIntegrityError`), so a malformed row is dropped from the read without wrongly
  engaging the key-mismatch lock.

Which fields stay plaintext is derived from the single schema source of truth
(`src/db/stores.ts`) by `src/lib/cloud/crypto/tableRules.ts`: a field is plaintext iff it
is the primary key, an index (including compound-index members), a cloud-reserved field
(`realmId`, `owner`) or the envelope itself. Everything else is sealed.

**Encrypted tables** (`SYNCED_TABLES`): `spaces`, `sections`, `docs`, `notes`,
`noteAttachments`, `annotations`, `citations`, `connections`, `revisions`, `palettes`.

## 4. The encryption middleware

`src/lib/cloud/crypto/middleware.ts` installs a DBCore middleware **above** the cloud
addon (`level: 10`) so the addon — and therefore the sync push queue — only ever sees
ciphertext. Writes are sealed before they reach the sync queue; reads are opened after.

- **Key source** — a synchronous `KeyProvider` (`deviceKeyProvider`). `null` means "no
  key yet": the middleware then passes rows through untouched, so the app keeps working
  before setup and the sync engine ships ciphertext verbatim.
- **Async crypto inside transactions** — WebCrypto is asynchronous, but Dexie commits a
  transaction the moment control returns to the event loop on a non-Dexie promise. Every
  seal/open is wrapped in `Dexie.waitFor`, which keeps the surrounding transaction alive
  (and degrades to a plain await outside one).
- **`openCursor` is intentionally not wrapped.** Dexie reads `cursor.value`
  *synchronously* during iteration, and `.modify()` needs to read and write inside a
  single live transaction — an `await` for a decrypt would break both. Cursor-driven
  reads (`.filter()`, `.each()`) and `.modify()` on encrypted tables therefore see the
  raw at-rest bytes; callers that need plaintext must use the key/query paths
  (`get`/`toArray`) and write explicitly. This is used deliberately by
  `sealExistingRows` (below), which relies on the raw cursor view to find rows still
  lacking `$lipsumCipher`.
- **Update descriptors are stripped from writes.** `Table.update()` /
  `Collection.modify()` (and `Table.upsert()`) reach the middleware as a `put` carrying
  both the full row *and* a plaintext `changeSpec`/`criteria`/`updates` describing the
  changed fields. The addon below prefers those descriptors when it logs the mutation, so
  left in place they would push the changed field values — a document rename, a body
  autosave — to the server **in the clear**, and the server would then stamp them onto its
  row beside the stale envelope. The middleware therefore strips those descriptors off
  every encrypted-table `put`, demoting it to a whole-row upsert of the sealed values —
  the one shape that cannot leak. (A row is sealed as a unit, so this is also why a
  rename and a body edit are whole-document last-writer-wins rather than independently
  mergeable.) `sealRow` correspondingly never re-seals a row that already carries an
  envelope: it preserves the envelope and drops any stray top-level secret fields, so a
  row an older client polluted with plaintext heals on re-ingestion instead of losing its
  body or name.
- **Inert inside blob-plumbing transactions.** The addon downloads any offloaded blob and
  patches it back into the row inside a transaction it marks `disableBlobResolve`. That
  read-modify-write is pure ciphertext plumbing: decrypting the read would fail (the row
  still holds an unresolved `{_bt,ref,size}` ref) and return `undefined`, which corrupts
  the write-back and leaves `_hasBlobRefs` set — an infinite download loop that saturates
  the main thread. The middleware detects that flag and passes such reads and writes
  straight through raw. (With the inline-string envelope of §3 no synced value is ever
  offloaded, so this path is a belt-and-braces guard for any pre-existing offloaded row.)

### Sealing existing data

`sealExistingRows` (`src/lib/cloud/setup.ts`) is a one-shot, idempotent migration run at
setup/unlock: for each synced table it re-puts rows still lacking the envelope so the
write middleware seals them and the addon queues them for the initial push. It reads
plaintext rows through the unwrapped cursor and re-writes them with `bulkPut` (which the
middleware seals) rather than `.modify()`, whose change-detection would skip a no-op
rewrite.

## 5. Cross-device reconciliation (pulled bodies → the CRDT)

The collaborative editor renders each document from a per-device CRDT — the Y.Doc rebuilt
from the local, **unsynced** `docUpdates` log — and `docs.body` is a serialised read model
kept in step by the editor's dual-write. Cloud sync replicates `docs.body`, **not**
`docUpdates` (the auto-increment log cannot sync, so CRDT history stays per-device). So a
body pulled from another device would sit in `docs.body` while a mounted editor kept
rendering the stale local Y.Doc, and the next local autosave would overwrite the pulled
body — the remote edit would silently vanish.

`src/lib/cloud/reconcile.ts` closes this. After each transition **out of the `pulling`
phase** (and once when a fresh device first reaches `in-sync`), `startCloudReconciler`
runs `reconcilePulledDocs`:

- **Detection.** For each doc it rebuilds the local Y.Doc from `docUpdates` and serialises
  it back to a Lexical body (`serializeDocSnapshot` — the inverse of the seed, kept inside
  the `yjs/` boundary that holds the only `Y.applyUpdate`/`Y.mergeUpdates` call sites).
  Every stored body is canonical serialized Lexical JSON — the default empty body
  (`EMPTY_LEXICAL_JSON`) is the exact form the editor emits, guarded by a test — so a row
  **equal to that snapshot** was produced by the local dual-write and is left untouched. No
  format-tolerance layer is needed or kept.
- **Same-device autosave lag.** A mounted editor persists `docs.body` on a 600 ms debounce,
  so mid-typing its CRDT is ahead of the row and the row reads as divergent. Before touching
  a mounted doc the reconciler **flushes the editor's pending autosave** through its handle;
  if that flush wrote unsaved edits, the divergence was lag — not a pull — and the live
  editor is left untouched, so reconciliation never runs while a local edit is mid-flush.
  Only a doc whose flush is a no-op is treated as a genuine remote pull. The flush knows a
  freshly-mounted, never-edited editor is clean because the autosave seeds its save baseline
  from the body persisted at mount (`persistedBody`), rather than starting empty and reporting
  its collaboration-seeded content as unsaved work.
- **Pre-mount reconciliation.** Before an editor mounts, `reconcileDocForMount` (gated by
  `useDocCrdtReady`) reconciles that one doc's CRDT against its row body: it seeds an empty
  log, or — for a populated log that diverged from a body pulled while the doc was closed —
  keeps the local snapshot as a revision and reseeds from the body. The editor therefore
  always mounts over a CRDT that already equals `docs.body`, so the baseline it captures is
  consistent and a stale local Y.Doc is never mistaken for unsaved edits.
- **Resolution (whole-document last-writer-wins).** For a genuinely divergent doc it first
  writes a **safety revision** of the local (losing) side, so a cross-device conflict is
  always recoverable. Then, if an editor is **mounted** (an `editorRegistry` handle exists),
  it replays the pulled body through the handle — an untagged local update that flows into
  the binding, persists, and broadcasts to sibling tabs. The handle's `restoreBody` resolves
  only once that update has committed in Lexical **and** reached the durable `docUpdates` log
  (the store's per-document `whenPersisted` barrier), so reconciliation records success only
  after the write has actually landed and treats a failed CRDT write as a per-doc failure
  that retries. If **unmounted**, it clears the doc's `docUpdates` lineage and reseeds from
  the pulled body.
- **Idempotency.** Because every body is canonical, a reseed's snapshot equals the pulled
  body exactly, so a second run detects no divergence and does nothing — no duplicate
  revisions, no churn. A doc whose body is unchanged since its last clean reconcile is
  skipped entirely, so a metadata-only change such as a rename never forces a body reconcile.

Lossless CRDT-level merge across devices (syncing encrypted `docUpdates` instead of body
snapshots) is a recorded open decision for a future release; today reconciliation
deliberately resolves at whole-document granularity.

### 5.1 Escrow reconciliation (which key is the account's)

A device sets its passphrase *before* it signs in, so at that moment it cannot know whether
the account already has a key. Rather than publish its escrow eagerly (two devices could
then race their escrows over the one `cloudCrypto` row and overwrite the account's key —
losing all of it), setup holds the escrow on the device. `src/lib/cloud/escrowReconcile.ts`
**re-runs on every transition into `in-sync` and on every change of sign-in identity** (not
once per boot — a device that signs in after boot still reconciles), with runs serialised
and idempotent. It compares fingerprints (§2):

- **Account has no escrow (pull confirmed complete)** → publish this device's. Its key
  becomes the account key. Publication is **add-only**: `publishPendingEscrow` refuses to
  overwrite a `v1` row whose fingerprint differs (it reports `kept-server` and keeps the
  pending escrow), so a last-writer-wins clobber of the account key is impossible.
- **Account has no escrow (pull not yet confirmed)** → **defer**. An absent row may just mean
  the account's escrow has not been pulled yet; publishing now would clobber it. Publication
  waits until `isAccountPullComplete()` is true, and reconciliation re-runs on the next settle.
  That gate is `persistedSyncState.initiallySynced` — the addon sets it in the same sync round
  that records the pulled realms and applies their rows, so once it is true any escrow the
  account holds (in a realm the user belongs to) is already local. It intentionally does **not**
  also require the user's private realm to appear in the pulled-realm set: the addon only
  enumerates a realm once it holds a row, so a brand-new account that never wrote an escrow
  would never satisfy that — leaving a keyless device that signed in first stuck on “fetching
  your account…” forever, unable to set up or publish.
- **Fingerprints match** → the account already holds this device's key; nothing to do. The
  server escrow is treated as ours when it carries **either** the device ring's fingerprint
  **or** the pending escrow's (they share a master, so normally identical — the pending copy
  is checked too, to cover a device that published its escrow and later re-derived its ring).
- **Fingerprints differ** → the account is protected by a **different** key. Flag a key
  mismatch and never publish over the account's escrow. On a `DEV`/E2E build the reconciler
  also logs both fingerprints, to tell a real other-device key from stale residue.

To keep a fresh device from tripping that mismatch on residue, setup is add-only in the
other direction too: `createCloudEncryption` mints a new master, so any escrow already in
the local database is a **different** key. While the device is signed out that row can only
be residue from an earlier local session, so setup drops it before deriving the fresh key.
Signed in, the row is the account's real escrow and is left for the mismatch/adopt flow.

While a mismatch is unresolved the write middleware refuses content `add`/`put` with
`CloudKeyMismatchError`, so no row sealed under the wrong key can reach the sync queue
(deletes still pass, for the escape hatch below). Reads of an account row **do not** crash:
the middleware drops the undecryptable row from the result (a single `get` returns
`undefined`, a list read omits it) and flags the mismatch on the spot — engaging the write
lock and the conflict banner — rather than throwing `EnvelopeIntegrityError` up to the
route-level recovery screen. That keeps the app reachable so the user can get to settings and
resolve the conflict; a read that crashed to the recovery screen would trap them there,
because the settings surface itself reads content. (The recovery screen
(`src/components/errors/`) still catches a genuine `EnvelopeIntegrityError` — e.g. a
wrong-key write path — and its **Unlock in settings** action is a full navigation to the
Account tab, since a render-time error boundary is not reset by a same-location `navigate`.)

The lock is also surfaced **where it bites**. The `useCloudLockReason` hook
(`src/hooks/useCloudLockReason.ts`) exposes the write-lock reason reactively — sharing the
middleware's `mismatch > keyless > none` precedence via `src/lib/cloud/crypto/lockReason.ts` —
so the New-space (Templates) screen can show an inline notice naming the reason, link to the
Account tab, and disable space creation before a doomed write is attempted. The submit path also
catches defensively: a refused `createSpaceFromTemplate` maps `isCloudKeyError` to the same
"locked" notice (anything else to a generic failure), so a lock that races the render is a notice
rather than an unhandled promise rejection.

The user resolves it from the cloud settings section in one of two ways:

- **Adopt** — enter the passphrase the account was created under. The account escrow is
  unwrapped, the device adopts that key, its own rows are re-sealed under it, and the master
  is re-wrapped under the passphrase kept going forward. Old data and new both decrypt; one
  passphrase remains.
- **Erase** (escape hatch, when that passphrase is lost) — drop the account rows this device
  cannot read (their deletions sync away), keep the notes it wrote itself, and publish this
  device's escrow as the account's. Because this is **irreversible**, it is a deliberate
  two-step gesture: the erase step carries an explicit "this can't be undone" warning and its
  destructive button is armed only once the user types a confirmation word (`ERASE`), mirroring
  the type-the-name gesture that guards deleting a space. It is safe against a stolen device or
  a hostile client — a delete only replicates for a realm the authenticated identity is already
  authorised to write, so the hatch can only erase content the signed-in user already owns; it
  is lost-passphrase recovery for your own account, not a way to overwrite someone else's.

The three-way loss — account passphrase forgotten **and** recovery code lost — ends only in
the erase path. There is no fourth option by design: the server never holds a readable key.

> **Follow-up (shared realms).** Today the escape hatch assumes a single-writer account. If
> content is ever shared into a realm with **multiple writers**, one co-writer running erase
> would re-key the shared realm and lock the others out. Before shared realms ship, erase must
> be gated to realm-owners server-side (client-side confirmation is not an authorisation
> boundary — the server is). Tracked as a design follow-up.

### 5.2 Signing in before a passphrase (the clean-device flow)

The **first** device keeps passphrase-before-sign-in: it has unencrypted writing that must be
sealed before it can sync, so `signInToCloud` turns it back with `KeylessSignInBlockedError`
(surfaced as a "set up first" banner) whenever `hasPlaintextSyncedRows()` is true. A **clean**
device (no plaintext synced rows — a fresh second device) may instead **sign in first**, then
adopt the account key. This removes the second-device catch-22 (sign-in was previously
disabled until a key existed, but the account key only arrives after sign-in) without
weakening the guarantee that plaintext never leaves the device:

- **Keyless write lock.** While a device is signed in without a key ring
  (`keylessLockState`, kept in step by `startKeylessLockMonitor`), the middleware refuses
  content `add`/`put` with `CloudKeylessWriteError` (deletes still pass), so no plaintext can
  reach the sync queue before a key exists. Like the mismatch lock, this reason surfaces through
  `useCloudLockReason` on the New-space screen — a notice explains that the device is signed in
  without a key and space creation is disabled until one is set up or adopted.
- **Sealed-row hiding.** A keyless signed-in device drops sealed rows it cannot open from
  reads (rather than returning raw ciphertext), so the UI never renders undefined fields.
- **Adopt or set up.** Once the account pull is confirmed, `cloudEscrowPresence`
  (`'unknown'` → `'present'`/`'none'`) drives `CloudKeylessAccountSection`: **present** →
  unlock with the passphrase from another device (this is the adopt step for a keyless
  device); **none** → set one up, which then publishes under the gated add-only path above.
  No key-minting action is offered while presence is `'unknown'`, so a set-up can never race
  ahead of the pull and diverge from the account key. This section is the **single** source of
  key actions while signed-in-keyless: `CloudEncryptionControls` then shows only sign-out (its
  set-up/unlock/sign-in appear only while signed out), so the presence gate cannot be bypassed
  by an always-visible Set-up button. Acquiring a key does not re-run mounted live queries, so
  the panel reloads afterwards to re-read everything decrypted.

Sign-in is also surfaced up front: with the beta flag on and the device signed out, the Home
page shows a "Sign in to sync your writing" row and Quick settings an "Account & sync" item
(both gated on `isCloudSyncEnabled()`), so the option is visible before a space is created.

### 5.3 Sign-out wipes the device; sign-in heals

The cloud addon's `logout` clears **every** table — including the app's local-only `docUpdates`
(CRDT log) and `meta` (seed markers). The device key ring survives (a separate keystore
database), and the synced `docs` rows re-pull on sign-in, but the local-only CRDT log is not
restored. We deliberately do **not** snapshot/restore those tables around logout: sign-out on
a shared machine must clear the device, and content heals from the row body anyway. Recovery:

- `reconcile.ts` detects an **empty CRDT log** for a doc whose row still has a body and heals
  straight from that body (reseed, or replay through a mounted editor) — with no spurious
  pre-sync revision, and never crashing on the empty snapshot (see §5 and the revision reader,
  which reads a parsed Lexical state without `setEditorState`).
- The editor mount is gated on `useDocCrdtReady` (`reseedIfEmpty` / `ensureDocCrdtSeeded`), so
  a doc whose log was wiped never mounts a blank editor that could autosave empty over its real
  body. The only true loss is per-device undo lineage — acceptable, and recorded here.

## 6. Device keystore (deviation from the original plan)

The device's derived key ring is persisted in a **dedicated, never-synced Dexie
database** (`lipsum-cloud-keystore`, `src/lib/cloud/crypto/keyStore.ts`) rather than a
`cloudKeystore` table inside the main application database. The `CryptoKey`s therefore
ride IndexedDB's structured clone and never exist as raw/JWK bytes, and there is no risk
of the ring being swept into the sync graph. `deviceKeyProvider` exposes a synchronous
`current()` view that the middleware polls. `forgetThisDevice()` clears only this
keystore; the escrow and other devices are untouched.

## 6.5. Device registry (the four-device beta limit)

The beta allows **four devices per account**, tracked in `cloudDevices` — a table that
**syncs but is not encrypted** (it sits outside `SYNCED_TABLES`). That is deliberate: a
device that has signed in but holds no key yet must still be able to count the slots and
learn it is past the cap, and it cannot read a sealed row. A row carries only the addon's
random per-device client identity — which the server already receives on every sync — and
timestamps: `joinedAt`, `lastSeenAt`, and `revokedAt` once revoked. **Never** a device
name, user agent, or content. `src/lib/cloud/devicePolicy.ts` holds the rules (pure, no
Dexie, no clock), `deviceRegistry.ts` the IO, `deviceRegistrar.ts` the subscriptions.

### The refresh interval is load-bearing

`cloudDevices` is synced, so **a `put` is a mutation even when the row is unchanged**. The
registrar runs on every settle into `in-sync`; an unconditional `lastSeenAt` refresh
therefore pushed, the push settled the sync round, the settle re-ran the registrar, and it
wrote again — an unbounded loop. It was measured at **1064 `/sync` requests** on one device
in minutes, saturating the main thread; users saw a UI that flashed "downloading" and hung.

So a run writes **only when something actually changed**: `lastSeenAt` refreshes at most
once per `DEVICE_REFRESH_INTERVAL_MS`, and never at all for a revoked row. A run that finds
nothing to do performs no write. Any future change here must preserve that property — and
must be tested by asserting that **no write was attempted**, never by comparing the stored
value, because a `put` of an identical row still enqueues a mutation and would sail through
a value comparison while the loop ran.

### Reclaiming a dead slot

`releaseThisDevice()` only runs on an explicit sign-out, so a wiped or discarded browser
profile used to hold its slot for ever — four of them locked an account out of cloud sync
completely, which is exactly what happened on the beta account. A slot now goes **stale**
after `DEVICE_STALE_AFTER_MS` of silence and may be reclaimed.

Authority is split, and both halves are needed:

- **Write side** — the registrar, on a signed-in *keyed* device, deletes rows it observed
  dead **in that run**. Deleting only observed-dead rows keeps it convergent: once they are
  gone, the next run finds nothing to delete and emits no further mutations.
- **Read side** — the blocked computation (`useDeviceSlots.ts`) counts only **live** rows.
  This is the escape hatch. A keyless device may read the registry but never writes to it,
  so it cannot prune anything; if dead rows still counted it would be trapped for ever.
  Filtering on read lets it unlock, gain a key, and only then prune.

### Revoking

Removing a device stamps `revokedAt` rather than deleting the row: the tombstone is how the
revoked device *learns* it was removed (the registrar surfaces it via `deviceRevokedState`).
It frees its slot immediately — `liveDevices` excludes it — and is swept once it is older
than the stale window. It is swept on `revokedAt`, never `lastSeenAt`: a revoked device
stops refreshing, so its `lastSeenAt` freezes at revocation and the two clocks would race.

### Tuning the windows

Both durations are overridable per deployment, in **seconds**, because a seven-day window is
otherwise untestable:

| Variable | Default | Meaning |
|---|---|---|
| `VITE_DEVICE_REFRESH_SECONDS` | `3600` (1 hour) | Minimum age of `lastSeenAt` before a refresh write |
| `VITE_DEVICE_STALE_SECONDS` | `604800` (7 days) | Idle time before a slot may be reclaimed |

A malformed or non-positive value falls back to the default rather than throwing — a
mistyped deployment variable must not brick the app, and zero would mean "refresh on every
sync", reviving the loop. **Keep refresh far below stale**: a live device must survive
missing several refreshes (a closed laptop, a flaky network) without a peer declaring it
dead. The defaults leave a 168× margin; the unit test guards that ratio on the *defaults*,
since an override deliberately tightens it for testing.

### It is a courtesy, not a boundary

The server does not enforce the limit — Dexie Cloud knows nothing about this table. A
revoked device keeps its session and its key and can still sync content; what revoking
guarantees is that it will not silently retake a slot, and that its user is told. Two
devices racing for the last free slot can transiently both take it. Treat the limit as a
beta courtesy, and never as a security control.

## 7. What the server can and cannot see

| Server **cannot** see | Server **can** see |
|---|---|
| Note and document bodies | Record ids and relationships (foreign keys) |
| Titles, names, note text, annotations | Timestamps (`createdAt`/`updatedAt`) |
| Citation authors/titles/abstracts | Note **kinds**, citation **keys** and **years** (indexed) |
| Attachment bytes | Your **email** (sign-in identity) |
| Any field not a primary key or index | Sync timing and originating IP |

Sign-in is invite-only (server-side allow-list). The at-rest local database is also
encrypted for synced tables once a key is present.

## 8. Deployment: CSP and security headers

The app deploys to Vercel as a static build; `vercel.json` sets a strict
Content-Security-Policy — the primary defence against script injection, the one attacker
class that could read local data or *use* (never extract) the non-extractable device keys.
Every header is public by design (a CSP's value is browser enforcement, not secrecy) and
the file holds no secrets.

- `script-src 'self'` — a production build has no inline scripts. `style-src` keeps
  `'unsafe-inline'` (recorded evidence: Radix, vaul and Lexical inject runtime inline
  `<style>`/`style=""`; React's `style={}` uses the CSSOM and is not blocked).
- `connect-src 'self' https://<db>.dexie.cloud wss://<db>.dexie.cloud` and
  `worker-src 'self' blob:` are the only cloud-specific relaxations — the sync fetch and
  websocket, and the addon's workers. `<db>` names the beta database host (`z1jm6a9cd`).
- The CSP host and the build's `VITE_DEXIE_CLOUD_URL` **must name the same database**. If
  they diverge, the addon connects to an origin the CSP does not allow and cloud sync fails
  loudly (a console CSP violation, sync blocked) rather than silently — and only flag-on
  beta users reach that path. `vercel.json` headers do not apply to the local Playwright
  preview, so the header set is verified manually on a preview deployment
  (`curl -sI <preview-url>`), not in CI.

## 9. Verification

- **Automated (CI):** the P1–P6 spike (`src/lib/cloud/crypto/middleware.test.ts`) stands
  up a real offline `dexie-cloud-addon` database and proves: ciphertext at rest (P1),
  **ciphertext in the `$<table>_mutations` sync queue — the go/no-go (P2)**, plaintext
  through the app (P3), IV uniqueness (P4), Blob round-trips (P5), and untouched
  local-only tables (P6). Envelope, key, recovery-code and setup suites cover the rest.
  The write-lock **surfaces** (the settings conflict banner and the New-space notice) are driven
  headlessly by the dev/e2e boot params `?cloud-mismatch=1` and `?cloud-keyless=1`
  (`applyDevBootParams` in `src/App.tsx`), which force the respective signal so the UI can be
  asserted without a live two-device sign-in (`templates-form.spec.ts`, `cloud-sync.spec.ts`).

- **Not verifiable in CI** (do not paper over these in any PR/summary):
  1. A real sync round-trip — needs a live Dexie Cloud database and an email OTP.
  2. The server's actually-stored bytes — P2's `$<table>_mutations` assertion is the
     strongest client-side proxy.
  3. Invite-list enforcement — server-side configuration.
  4. First-activation migration of a large *existing* local database into the cloud
     schema relies on the addon's own reconciliation, which fake-indexeddb does not
     reproduce faithfully; confirm it in a real browser via the manual protocol.
  5. Cross-device **editor** reconciliation (§5) — a body edited on device A reaching the
     mounted editor on device B — needs two real synced devices; the unit suite proves the
     detection/resolution logic against simulated databases, not a live pull.
  6. Escrow reconciliation and key-conflict resolution (§5.1) — publishing the first
     escrow, and the mismatch → adopt/erase flow on a wiped or second device — needs a live
     account with a pulled escrow; the unit suite proves the publish/match/mismatch decision
     and the adopt/erase mechanics against simulated databases, not a live sign-in.

### Manual protocol (run once before inviting any tester)

1. `npx dexie-cloud create` → obtain the database URL (the beta database is `z1jm6a9cd`).
2. `npx dexie-cloud whitelist <app-origin>`.
3. `vercel.json`'s `connect-src`/`worker-src` name the database host, and `VITE_DEXIE_CLOUD_URL`
   is set to the same origin (they must match, or the CSP blocks sync loudly); build.
4. On a preview deployment, `curl -sI <preview-url>` shows every security header, and the
   app boots and runs this protocol with **zero** CSP violations in the console.
5. In **two different browsers**, activate via `?cloud-sync=on`.
6. Set up the passphrase in browser A; unlock (same passphrase) in browser B.
7. Sign in with an invited email (OTP).
8. Create a doc in A → it appears **decrypted** in B; edit it in B with A's editor open →
   the change reconciles into A's editor (§5), and A keeps a safety revision of its prior
   local state.
9. Inspect the stored rows via the Dexie Cloud dashboard/REST: every content field must be
   **absent**, with only `$lipsumCipher` plus ids/indexed fields visible.
10. **Wiped-device re-sign-in (the key-conflict path, §5.1).** In browser B clear site data
    (IndexedDB `lipsum` and `lipsum-cloud-keystore`), reactivate via `?cloud-sync=on`, set a
    **new** passphrase, then sign in with the same account. B must detect the mismatch and
    show the conflict banner — **not** silently corrupt or crash. Enter A's passphrase to
    adopt: A's notes decrypt and B's own notes survive. Repeat once more entering a **wrong**
    passphrase first — it must show an inline error and stay on the conflict surface, never
    the app's error boundary.
11. **Sign-in-first on a clean device (§5.2).** In a **third**, clean browser C, activate via
    `?cloud-sync=on` and **sign in before** setting a passphrase. Content stays locked until
    you unlock: the account section offers **Unlock now** — enter A's passphrase to adopt the
    account key, and A's notes decrypt after the reload. (Attempting the same on a browser that
    already has unencrypted writing must be turned back with a "set up first" notice.)
12. **Sign out and back in (§5.3).** In browser A, sign out then sign back in. Every document's
    content must still render and remain editable — no blank editor and no Lexical error in the
    console — because the wiped CRDT log heals from the re-pulled body.

If any plaintext content field is visible server-side, **the beta must not be offered to
anyone** — file the failure and stop.
