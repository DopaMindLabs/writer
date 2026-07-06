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
  already ciphertext gated by the passphrase.
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
CipherEnvelope { v: 1, epoch, iv: Uint8Array(12), data: Uint8Array }
```

- **Algorithm** — AES-256-GCM, a fresh 12-byte random IV per seal.
- **AAD (row binding)** — `lipsum:1:<epoch>:<table>:<primaryKey>`. Because the table,
  primary key and epoch are authenticated, a ciphertext moved to another row or table
  fails authentication (`EnvelopeIntegrityError`) instead of silently decrypting.
- **Payload** — the secret fields are JSON-serialised with a tagged encoding so
  `Uint8Array` and `Blob` values round-trip; function values are rejected.

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
  Only a doc whose flush is a no-op is treated as a genuine remote pull.
- **Resolution (whole-document last-writer-wins).** For a genuinely divergent doc it first
  writes a **safety revision** of the local (losing) side, so a cross-device conflict is
  always recoverable. Then, if an editor is **mounted** (an `editorRegistry` handle exists),
  it replays the pulled body through the handle — an untagged local update that flows into
  the binding, persists, and broadcasts to sibling tabs. If **unmounted**, it clears the
  doc's `docUpdates` lineage and reseeds from the pulled body.
- **Idempotency.** Because every body is canonical, a reseed's snapshot equals the pulled
  body exactly, so a second run detects no divergence and does nothing — no duplicate
  revisions, no churn.

Lossless CRDT-level merge across devices (syncing encrypted `docUpdates` instead of body
snapshots) is a recorded open decision for a future release; today reconciliation
deliberately resolves at whole-document granularity.

### 5.1 Escrow reconciliation (which key is the account's)

A device sets its passphrase *before* it signs in, so at that moment it cannot know whether
the account already has a key. Rather than publish its escrow eagerly (two devices could
then race their escrows over the one `cloudCrypto` row and overwrite the account's key —
losing all of it), setup holds the escrow on the device. `src/lib/cloud/escrowReconcile.ts`
runs once the first sync reaches `in-sync`, when the account's escrow (if any) has been
pulled, and compares fingerprints (§2):

- **Account has no escrow** → publish this device's. Its key becomes the account key. There
  was nothing to overwrite, so publication is add-only.
- **Fingerprints match** → the account already holds this device's key; nothing to do.
- **Fingerprints differ** → the account is protected by a **different** key. Flag a key
  mismatch and never publish over the account's escrow.

While a mismatch is unresolved the write middleware refuses content `add`/`put` with
`CloudKeyMismatchError`, so no row sealed under the wrong key can reach the sync queue
(deletes still pass, for the escape hatch below); any read of an account row throws
`EnvelopeIntegrityError`, caught by the route-level recovery screen
(`src/components/errors/`). The user resolves it from the cloud settings section in one of
two ways:

- **Adopt** — enter the passphrase the account was created under. The account escrow is
  unwrapped, the device adopts that key, its own rows are re-sealed under it, and the master
  is re-wrapped under the passphrase kept going forward. Old data and new both decrypt; one
  passphrase remains.
- **Erase** (escape hatch, when that passphrase is lost) — drop the account rows this device
  cannot read (their deletions sync away), keep the notes it wrote itself, and publish this
  device's escrow as the account's.

The three-way loss — account passphrase forgotten **and** recovery code lost — ends only in
the erase path. There is no fourth option by design: the server never holds a readable key.

## 6. Device keystore (deviation from the original plan)

The device's derived key ring is persisted in a **dedicated, never-synced Dexie
database** (`lipsum-cloud-keystore`, `src/lib/cloud/crypto/keyStore.ts`) rather than a
`cloudKeystore` table inside the main application database. The `CryptoKey`s therefore
ride IndexedDB's structured clone and never exist as raw/JWK bytes, and there is no risk
of the ring being swept into the sync graph. `deviceKeyProvider` exposes a synchronous
`current()` view that the middleware polls. `forgetThisDevice()` clears only this
keystore; the escrow and other devices are untouched.

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

If any plaintext content field is visible server-side, **the beta must not be offered to
anyone** — file the failure and stop.
