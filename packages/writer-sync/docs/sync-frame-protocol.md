# Writer Sync operation frame protocol

Status: Stage 2A, through slice 2A.7. Unlike the
[pairing protocol](./pairing-protocol.md), this document is **descriptive**: the
frame format, its authenticated binding and its convergence rules were fixed by
Stage 1 and are implemented today. It is written down here because Stage 2A adds
a second transport, and a second transport must meet the format rather than
negotiate with it.

Where a rule is *not* yet implemented it says so explicitly, with the slice that
owns it. Sections 9 and 10 record the device signature and attachment transfer
that Stage 2A added to the Stage 1 frame.

Source of truth for behaviour, in order of precedence: the code named in each
section, then this document. A disagreement between them is a bug in one of the
two and must be resolved, not narrated.

---

## 1. Model

One logical mutation of one entity becomes one **operation**, encrypted **once**,
and carried verbatim by every enabled provider. A receiver records the operation
id before materialising, so the same operation arriving through two providers
cannot apply twice.

This is what lets Stage 2A add a peer-to-peer provider without touching the data
path: frames are already immutable, already encrypted, already deduplicated, and
`applyInboundFrame` is provider-agnostic. The multi-provider contract suite
(`src/lib/writerSyncIntegration/materialization/multiProviderContract.test.ts`)
proves the same frame arriving by two routes materialises once, in either order.

```
SYNC_OPERATION_VERSION = 1
```

A frame whose `v` is not exactly this is rejected — `decodeFrame` throws
`MalformedFrameError` naming the version. There is no permissive parsing and no
downgrade path.

---

## 2. Frame structure

`EncryptedSyncFrame` is the routing header plus the opaque payload.

| Field | Type | Visibility |
|---|---|---|
| `v` | `1` | Plaintext |
| `operationId` | `OperationId` | Plaintext |
| `accessScopeId` | `AccessScopeId` | Plaintext |
| `entityTable` | string | Plaintext |
| `entityId` | string | Plaintext |
| `kind` | `'put'` \| `'delete'` | Plaintext |
| `deviceId` | `DeviceId` | Plaintext |
| `logicalAt` | `{ millis, counter }` | Plaintext |
| `keyId` | string | Plaintext |
| `epoch` | number | Plaintext |
| `payloadHash` | SHA-256, base64 | Plaintext |
| `payload` | base64 ciphertext | Sealed |
| `signature` | base64 | Plaintext, **empty in Stage 1** (§9) |

**The disclosure boundary is deliberate and must not widen.** A provider sees the
routing header — enough to route, dedupe and order — plus opaque ciphertext. The
entity's content fields and the acting principal are inside the payload.

Notably **not** in the header: the acting principal. Attribution (`createdBy`,
`updatedBy`) is sealed inside the payload and must never be mapped onto a
provider's ownership concept — asserted in `src/lib/cloud/frameReplication.test.ts`.
A peer-to-peer provider has no `owner` notion at all, which is exactly why the
rule exists rather than being left to each adapter's judgement.

---

## 3. Authenticated binding (AAD)

The payload is sealed with AES-GCM whose additional authenticated data binds it to
its header. The AAD is the UTF-8 encoding of these values joined by `:`, in this
order (`operationCrypto.ts`):

```
lipsum-op : v : operationId : accessScopeId : entityTable : entityId
          : kind : deviceId : logicalAt.millis : logicalAt.counter : keyId : epoch
```

Consequences a second transport must understand:

- **A header altered in transit fails authentication at decryption**, not merely
  at a hash check. Rewriting the scope, the entity, the kind or the device is
  detected.
- **Logical time is bound on purpose.** It decides which write wins on every
  receiver, so a transport able to retime a frame without invalidating it could
  force stale content over newer content.
- **`payloadHash` is deliberately excluded** — it is derived from the ciphertext
  the AAD already protects, so binding it would be circular.
- **`signature` is excluded**, and must be: it is computed *over* the sealed
  frame, so it cannot also be an input to the sealing (§9).

---

## 4. Payload sealing

For a `put`, the entity's content fields are sealed:

1. Binary values are tagged (`tagBinary`) so they survive JSON.
2. The result is `JSON.stringify`-ed and UTF-8 encoded.
3. A fresh 12-byte IV is drawn from the CSPRNG per operation.
4. AES-256-GCM encrypts under the ring's non-extractable `contentKey`, with the
   AAD of §3.
5. `payload` is base64 of `iv || ciphertext` — the IV is the first 12 bytes.

Opening reverses this and throws `OperationPayloadIntegrityError` on any failure,
without distinguishing a wrong key from a tampered header — the distinction would
be an oracle and is not offered.

A `delete` carries an empty payload.

`noteAttachments` is the bounded exception to putting the complete row inside
that ciphertext. Its `blob` is sealed once as raw bytes with AES-GCM, bound by
AAD to `{ accessScopeId, entityTable, entityId, keyId, epoch }`, then split as
described in §10. The row payload carries `blobRef: AttachmentChunkManifest`
instead of `blob`; every other field remains inside the ordinary frame
ciphertext. The receiver restores the required `Blob` only after the referenced
ciphertext is complete and authenticated.

The content key is derived per epoch by HKDF-SHA-256 from the account root with
info `lipsum-content-v1`, and is non-extractable. `keyId` and `epoch` name the key
so a receiver can select the right one; they are not themselves secrets.

---

## 5. Payload hash, and why deletion framing is synchronous

```
payloadHash = base64( SHA-256( utf8( payload ) ) )
```

The hash is over the **base64 text** of the payload, not over the raw ciphertext
bytes. An implementation that hashes the decoded bytes computes a different value
and every frame it sends is rejected. This is the single most likely
interoperability mistake for a new transport.

```
EMPTY_PAYLOAD_HASH = "47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU="
```

`makeDeleteFrame` is **not** `async`. It uses the precomputed constant above —
asserted equal to `hashPayload('')` in the codec tests — so a deletion never
suspends its transaction.

That constraint comes from Dexie, and Stage 2A code must respect it wherever it
touches a DBCore middleware: **do all Web Crypto before delegating the mutation
downward.** Two independent reasons, both real. Dexie tracks the live transaction
in its own promise zone, and an `await` on a native promise leaves that zone, after
which the addon's hooks middleware reads an undefined transaction. And
`Dexie.waitFor` spins its keep-alive only while it is the *outermost* wait, which
it is not once the row-encryption middleware has opened its own. Getting this
wrong **hangs the write** rather than failing it. The block comment above `inTx` in
`operationJournalMiddleware.ts` is the long form.

---

## 6. Validating an inbound frame

A frame is untrusted input whatever carried it. `operationCodec.ts` validates in
two stages.

`decodeFrame` — structure only, synchronous:

- the value is a non-array object;
- `v` equals `SYNC_OPERATION_VERSION`;
- `kind` is exactly `put` or `delete`;
- `operationId`, `accessScopeId`, `entityTable`, `entityId`, `deviceId` are
  non-empty strings;
- `keyId`, `payloadHash`, `payload`, `signature` are strings — `keyId` and
  `signature` may be empty, the latter because Stage 1 writes it so;
- `epoch` and `logicalAt.millis` / `logicalAt.counter` are finite numbers;
- a `put` carries a non-empty payload.

Failures raise `MalformedFrameError` with the offending field.

`verifyFrame` — adds:

- `WrongScopeFrameError` when `expectedScope` is supplied and disagrees;
- `FramePayloadMismatchError` when the recomputed hash disagrees with
  `payloadHash`, checked **before** anything looks inside the ciphertext.

> **Note for Stage 2A.** `expectedScope` is optional, and `applyInboundFrame`
> currently calls `verifyFrame` without it — the scope binding is still enforced,
> but by the AAD at decryption rather than structurally at the boundary. A
> peer-to-peer transport receives frames on a channel that is already
> scope-specific (`createTransport({ accessScopeId, channelId })`) and therefore
> **should** pass `expectedScope`, so a wrong-scope frame is rejected at the edge
> and never reaches the key material.

---

## 7. Convergence

Deterministic on every device, from `convergence.ts`:

```
compareOperations(a, b) =
  compareTimestamps(a.logicalAt, b.logicalAt)
  || a.deviceId.localeCompare(b.deviceId)
  || a.operationId.localeCompare(b.operationId)
```

Hybrid logical time first, then device id, then operation id as a final total
order. **Provider arrival order carries no meaning.** Two devices given the same
set of operations reach the same state whatever order the transports delivered
them in.

Rules the materialiser enforces (`writerOperationMaterializer.ts`):

- Every material change mints a **fresh** operation id and logical time.
- Deletions are ordered against the journal winner exactly as puts are: a delete
  that loses to a strictly later journalled `put` returns `superseded` and does
  **not** remove the row.
- A delete records a tombstone, and the **latest** deletion is kept — an older
  delete arriving afterwards must not rewrite the tombstone a later put is
  compared against.
- A `put` that does not supersede an existing tombstone returns `tombstoned` and
  cannot resurrect the entity. Ties go to the deletion.
- Applying an inbound operation never emits a new local operation. Only the
  explicit factory journalises.
- The frame written to the journal is the ciphertext **as received**, immutable
  and never re-encrypted, so this device can serve it onward to another provider
  unchanged.

**Clock merging.** An accepted frame's logical time merges into this device's
clock, so the next local edit is stamped after everything the device has seen —
without it, a device whose wall clock lags loses every conflict until the clock
catches up. Merging is bounded by `MAX_OBSERVED_DRIFT_MILLIS` (five minutes): a
frame's logical time is authenticated but not *trusted*, and a peer with a broken
or hostile clock must not be able to push this device's clock years forward.

---

## 8. Idempotence, the journal and tombstones

`applyInboundFrame` decrypts **before** opening the transaction (§5), then in one
`readwrite` transaction spanning the entity table, `syncOperations`, `syncInbox`
and `syncTombstones`:

1. reads `syncInbox` for the operation id and returns the recorded result if
   present — an already-accepted operation is a no-op that reports what it did the
   first time;
2. journals the frame verbatim into `syncOperations`;
3. materialises (`applied`, `superseded` or `tombstoned`);
4. writes the `syncInbox` entry.

Because the check and the write share a transaction, concurrent delivery of the
same operation through two providers cannot both pass.

> **Known gap carried into Stage 2A.** The journal grows without bound: Stage 1
> never prunes `syncOperations`. `SyncTombstone.acknowledgedBy` is the seam for
> acknowledgement-based compaction and is currently always `[]`. A two-device sync
> makes this visible quickly, and the trusted-device registry's
> *last acknowledged operation per scope* (runbook §19) is the other half of the
> mechanism. Decide the compaction rule during slice 2A.7, not after.

---

## 9. The signature

`signature` exists on every frame. Stage 1 wrote `''`; Stage 2A fills it.

The sending device signs with its cryptographic device identity, and a receiver
verifies against the trusted-device registry before materialising. Without it a
frame is authenticated *as content* — the AAD proves the header and payload
belong together — but not attributed *to a device*: any holder of the content key
could author a frame naming another device.

**Decided 2026-07-28** (runbook §30.1): **ECDSA P-256 over SHA-256**, via
WebCrypto, reusing the device identity key from `deviceIdentity.ts`. No new
dependency, no second key to manage, and the same primitive pairing already
depends on. Implemented in `crypto/frameSignature.ts`, with the registry check in
`crypto/trustedFrameVerifier.ts`.

The requirements the implementation satisfies:

- It is computed over the complete frame **minus** `signature` itself, including
  `payloadHash`, under a domain-separated label distinct from the pairing labels
  in `pairing-protocol.md` §10.
- It is verified **after** structural validation and the payload-hash check, and
  **before** decryption — an unsigned or badly-signed frame must never reach the
  key material.
- A frame from a device that is unknown, removed or revoked in the registry is
  rejected with a typed error and is not journalled. Journalling it would let a
  removed device fill the journal.
- Verification failure is not retried and not partially applied.
- The signing input is the domain label `lipsum-frame-sign-v1`, a `0x00`
  separator, then the canonical JSON of the frame minus `signature`. The label
  differs from every pairing label in `pairing-protocol.md` §10, so a pairing
  signature can never verify as a frame signature — asserted in
  `frameSignature.test.ts`.

**When acceptance of `''` ends.** It has ended: `createTrustedFrameVerifier`
refuses an empty signature. It refuses rather than throws, because Stage 1 frames
with `''` are ordinary old data on disk, not a caller's mistake — such a frame is
simply no longer attributable and is not journalled from a peer.

**A consequence worth stating.** Refusing unknown origins means a device accepts
operations only from devices it has itself paired with. Where A–B and B–C are
paired but A–C are not, B cannot relay A's operations onward to C. That is the
conservative reading of the rule above; widening it needs a way for C to learn
A's identity key that does not amount to B vouching for it.

---

## 10. Attachment chunk manifest

`AttachmentChunkManifest` describes the sealed attachment ciphertext carried
outside the thin operation frame:

```ts
interface AttachmentChunkManifest {
  attachmentId: string;
  contentHash: string;   // SHA-256 of the complete content, base64
  totalBytes: number;
  chunkBytes: number;
  chunkCount: number;
  chunkHashes: string[]; // SHA-256 per chunk, base64
}
```

The attachment bytes are encrypted once before chunking. This avoids the former
base64-inside-JSON-inside-base64 framing cost and makes every hash verifiable
without opening the content. Writer uses 131,072-byte transfer chunks so a
base64url chunk plus its JSON envelope remains below WebRTC's 262,144-byte
message ceiling.

Every manifest is untrusted input. `validateChunkManifest` refuses content above
104,857,600 bytes, chunks above 1,048,576 bytes, or more than 4,096 chunks, and
requires `chunkCount` to equal both `chunkHashes.length` and
`ceil(totalBytes / chunkBytes)`. Each received chunk is size- and SHA-256-checked
before incremental storage; the assembled ciphertext is checked against
`contentHash`, then AES-GCM authentication binds it to the framed row before a
`Blob` is materialised.

Transfer is resumable. A holder offers manifests only after the catch-up frame
batches and their final marker; the receiver asks only for missing indices.
Verified chunks persist immediately, so a later peer session resumes from the
stored gap. A thin attachment frame stays journalled but absent from `syncInbox`
while chunks are missing, and the ordinary ingestion sweep retries it when the
transfer completes. Dexie Cloud carries the same bounded ciphertext as replicated
`syncAttachmentChunks` rows, so the thin frame contract is identical across
providers.

---

## 11. Scope rebinding

A frame cannot be relabelled into another scope — the scope is in the AAD (§3).
Moving content between scopes legitimately goes through `rescopeFrames.ts`, which
opens each frame under the source key and reseals it under the destination,
all-or-nothing. Any Stage 2 flow that moves content between scopes uses it; none
may edit `accessScopeId` in place.

---

## 12. Obligations on a provider

A provider — Dexie Cloud, a WebRTC peer, anything later — **must**:

- carry frames verbatim, byte for byte;
- deliver each frame at least once, and tolerate delivering it more than once;
- pass `expectedScope` where its channel is scope-specific (§6);
- surface transport failures as typed errors rather than silent drops.

A provider **must not**:

- re-encrypt, re-sign, reorder-for-meaning, merge, split or rewrite a frame;
- read or depend on anything inside the payload;
- derive access-control decisions from `createdBy` / `updatedBy` (§2);
- assume its own delivery order is the convergence order (§7);
- implement `accessControl` when it has no server-side authority — a peer-to-peer
  provider offers `realtime` and `discovery`, and omits the capability rather
  than stubbing it.

---

## 13. Where the boundary is enforced

`packages/writer-sync/test/packageBoundary.test.ts` fails on any `@/` import, any
path into `src/`, any React/Dexie/Yjs/Lexical import, any `node:` builtin and any
wildcard re-export in engine source. `test/consumer.test.ts` is a second consumer
standing in for a future host application.

Stage 2A code that is genuinely transport-neutral belongs in the package behind an
explicit barrel export. Anything that knows a Writer table, a Dexie handle or a
React hook belongs in `src/lib/writerSyncIntegration/`. The boundary is executable,
so this is a test failure rather than a review comment.
