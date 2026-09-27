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
(`src/lib/writerSyncIntegration/materialisation/multiProviderContract.test.ts`)
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

The content key is derived per epoch by HKDF-SHA-256 from the root secret with
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

Rules the materialiser enforces (`writerOperationMaterialiser.ts`):

- Every material change mints a **fresh** operation id and logical time.
- Deletions are ordered against the journal winner exactly as puts are: a delete
  that loses to a strictly later journalled `put` returns `superseded` and does
  **not** remove the row.
- The saved row keeps its logical time after compaction drops the frame that
  wrote it. A put or delete older than that time returns `superseded`, so a frame
  arriving late cannot overwrite or remove newer content the journal no longer
  holds. An exact tie is left to the journal: the row does not record its author.
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
4. writes the `syncInbox` entry, carrying the frame's origin device and logical
   time alongside the result.

Because the check and the write share a transaction, concurrent delivery of the
same operation through two providers cannot both pass.

The inbox is never pruned, and it is more than replay protection: its entries
are the durable record of what this device has **seen** per scope and origin.
The catch-up scope manifest is built from that seen-set (the union of the
retained journal and the inbox), never from the journal alone — compaction
drops frames every peer holds, and a manifest built from what *survives* forgets
whole origins, so a peer would re-author the scope as fresh full-state frames on
every session, for ever. What a device has seen only grows, so the manifests of
two converged devices agree — same marks, same counts on both sides — and the
exchange goes quiet.

A host that releases a deletion (`releasableTombstones`) records, in the same
transaction and before the tombstone and its delete frame go, an inbox entry for
every retained operation of that entity at or before the deletion that the inbox
has not recorded: the deletion `applied`, an older `put` `tombstoned`, an older
`delete` `superseded`. Only a frame that passes materialisation's admission —
structure, payload hash, table policy and a trusted signature, verified before the
transaction and still, field for field, the retained frame inside it (a signature
copied onto altered content is not the frame that was verified) — earns an entry. A
verified frame the journal loses between the check and the transaction, as a
compaction replicated from another device can do, still earns its entry from the
copy verified, and one that may yet pass holds the deletion: a peer can replay
either. A host keeps its own copy of such history while the deletion stands, apart
from the replicated journal, so the hold outlasts the frame; the copy goes once it
earns a verdict, can never be admitted, or has no deletion left to hold. Retained
history is matched by content, not operation id: a row a provider writes under a
copy's id neither stands in for the copy nor lets its deletion go. A deletion is released only once every such operation has one, or can never be
admitted (malformed, altered, unsigned, signed with a key other than the one its
author's device id is derived from, or naming a table peers do not own). A
retained row is decoded before its order is read: one that does not decode has no
order or age to judge, can never be admitted and is inert, so it neither holds a
deletion nor earns an entry, and compaction leaves it where it is. A frame
refused only because no key for its author is known yet, or for its clock, may
verify later, when its author's identity arrives, and would then resurrect the entity if the deletion were already
gone, so the deletion, its frame and that history stay until it verifies. The
retention window keeps the same line under a deletion still standing: history
admissible now is settled with an inbox entry as the window takes it, history that
may yet be admitted stays, and history that never can goes as it is. A tombstone is
retired only while it still names the deletion being released: a later deletion
that ingestion wrote in the meantime stays, and every tombstone still standing keeps
its frame. Operations a device authors itself are journalled without
an inbox entry, and the tombstone is the only evidence that settles them; released
alone, an older `put` would read as unapplied and resurrect the entity when next
materialised. A later operation is left alone — it may legitimately restore the
entity.

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

**Every route, not just the peer link.** Materialisation verifies the signature
itself, so a frame a durable provider replicates straight into the journal is
attributed before it is decrypted, journalled or applied. The host supplies the
verifier; Writer's (`writerFrameVerifier.ts`) accepts a paired device from the
registry, and this device's own frames against its own public key — a frame
forged under this device's id fails like any other.

**A consequence worth stating.** Refusing unknown origins means a device accepts
operations only from devices it has itself paired with. Where A–B and B–C are
paired but A–C are not, B cannot relay A's operations onward to C — and a device
that reaches another only through a durable provider, having never paired with
it, converges nothing. That is the conservative reading of the rule above;
widening it needs a way for C to learn A's identity key that does not amount to
B vouching for it.

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

Transfer is resumable, and demand-driven in both directions. A holder offers
manifests only after the catch-up frame batches and their final marker, one page
of at most `MAX_OFFERS_PER_PAGE` at a time — the number a receiver will assemble
at once. Offering more is worse than offering fewer: the receiver refuses
everything past its in-flight ceiling and those attachments are never mentioned
again. Each page carries a `cursor` into the holder's catalogue, and the
receiver answers with `attachment-offer-next` once every manifest in the page is
complete, already held or refused, which is what walks a catalogue of any size.
Each settled offer is reported to the host through the optional `onSettled` port,
whatever became of it, so state a host keeps per offer lasts only as long as the
offer.

The cursor is session state on both sides, and only one value is legal at a
time: the receiver takes a page only at the cursor after the last one it
settled, and the holder serves an `attachment-offer-next` only for the page it
is waiting to be asked for. A cursor that is replayed, points backwards,
overlaps a page already taken, skips one, or arrives while a page is still
outstanding fails the session with `AttachmentCursorError`, as does a page
offering no manifests. Silently re-offering or overwriting the page in flight
would drop the attachments in it and leave both devices acknowledging a place in
the catalogue neither is at. The holder's catalogue is therefore append-only for
the life of the session: an offer made while the session is open — a live link
naming attachments one by one as they are written — extends the catalogue and is
served at the continued cursor, riding a round-trip already in flight where one
is outstanding. An offer never restarts the catalogue at zero.

The receiver asks only for missing indices, at most `MAX_REQUESTED_CHUNKS` at a
time, and asks for the next page only once the one in flight has been answered:
asking after every chunk would have the holder serve indices it is already
serving. Chunks are served against the transport's `sendWhenReady`, so the
holder moves at the bearer's pace — a legal request of 256 chunks answered in
one pass would overrun the outbox in front of the channel and fail a session
neither peer misused. A transfer serves only what it offered, as it offered it: a
chunk whose ciphertext was replaced after the offer (a scope move reseals it for
another scope) is reported unavailable rather than sent, and a request for an
attachment it never offered is left to whichever transfer on the link did. A holder that cannot supply an index it was asked for says so with an
`attachment-unavailable` message rather than falling silent — the receiver is
waiting on that page, so silence stalls the transfer for the life of the
session. The transfer is then dropped rather than left pending, so a later offer
can start it again. Verified chunks persist immediately, so a later peer session
resumes from the stored gap. A thin attachment frame stays journalled but absent from `syncInbox`
while chunks are missing, and the ordinary ingestion sweep retries it when the
transfer completes. Dexie Cloud carries the same bounded ciphertext as replicated
`syncAttachmentChunks` rows, so the thin frame contract is identical across
providers.

---

## 11. Scope rebinding

A frame cannot be relabelled into another scope — the scope is in the AAD (§3).
Writer's `rescopeFrames.ts` moves the current locally accepted rows and retained
tombstones in the source scope. The journal is not a source of current content:
per-origin compaction can retain an obsolete edit while removing its successor.
A current row remains movable even if none of its original frames survive. A
current tombstone requires its retained, verified delete frame. Entities whose
saved state is already in another scope are excluded, including when the frames
that moved them have been compacted.

A current row gets two fresh operations signed by the moving device: a delete in
the source scope, then a put in the destination scope at a later logical time. A
device that reads only the source scope is never offered the destination put;
without the withdrawal it would keep its copy, and its next edit would win
convergence and move the row back. With it, that device removes the row and holds
a tombstone, while a device that reads both scopes sees the later put win,
whichever frame reaches it first, even when the destination put was compacted
before the withdrawal arrived. No tombstone holds the withdrawal, since the entity
lives on in the destination, so compaction never ages it out (`keptUntilHeld`):
it leaves only once every peer holds it, and the frame each peer's acknowledgement
names stays with it, since that is the only evidence the peer holds it. A rebuild of the source scope serves it
beside the scope's tombstones, so a device that reads only the source and returns
after the retention window still drops the row. Only a withdrawal that passes
admission, or that this device accepted while its author was trusted and that
still verifies against the author's recorded key, is kept and served this way: a
delete a provider merely wrote ages out. A retained tombstone gets one fresh delete in
the destination: devices that read the source already hold the deletion. New
operation ids avoid prior inbox deduplication; logical times follow the current
state. Put payloads carry the destination `accessScopeId`, new `mutationId` and
new `logicalUpdatedAt`, matching the header. Existing content and editorial
attribution are preserved. Attachment bytes are resealed under the destination
binding and carried in new ciphertext chunks. Deletes receive fresh headers and
signatures without a payload. Original frames remain immutable. A live link
offers an attachment only with a put in its own scope, and only while the chunk
set and the saved row are in that scope too, so the withdrawal crosses the source
link without the ciphertext that moved away.

A device keeps one chunk set per attachment: the ciphertext of the attachment's
latest operation in convergence order, labelled with that operation's scope.
Materialisation decides whether a put still wins before it assembles attachment
content, so the retained source frame settles as `superseded` without the
ciphertext the move replaced; a put found winning after all once its transaction
opens has its content assembled and applied in the same call. A receiving device labels arriving chunks with the
scope of the attachment's latest admitted operation — never by journal key order,
and never by a frame that fails admission — and chunks held under another scope do
not count as held, so a device that
already had the source attachment fetches the moved ciphertext. A transfer binds
each offered attachment to that operation once, when it considers the offer, and
labels every chunk it saves from the binding rather than reading and verifying the
history per chunk; an operation journalled mid-transfer is picked up by the next
offer. The binding is released when its offer settles, including an offer whose
chunks were all held and that started no transfer. A catch-up reply
journals its frames before it offers attachments, so the moved frame is known when
its chunks arrive. Chunks are still identified by attachment id and index alone:
a device that has journalled the move without yet receiving the moved ciphertext
can accept a pre-move chunk set from a peer that has not seen the move, and holds
the wrong ciphertext until the transfer identifies chunk sets by content hash.

Both scope keys must be available for every journalled content table before
reading state: the encryption middleware hides rows it cannot open, a resolver may
answer per table or per row, and hidden rows must never be mistaken for an empty
scope. A cursor read passes the middleware by and sees each row's routing metadata
in the clear, so the snapshot also records every row stored in the source scope
that it could not read. Any such row refuses the move, whether no key resolves for
it or the key that does fails to open it: the move cannot carry a row it cannot
open. A move prepares one entity at a time and holds each attachment's new
ciphertext until it commits, so it refuses, before reading any content, to carry
more than `MAX_ATTACHMENT_BYTES` of attachments in total.
Withdrawing a current row also needs the source write key. Retained
source and related entity history passes structure, hash, journalled-table policy,
trusted signature and clock checks before signing; history this device accepted
earlier, whose inbox entry records the same operation, author, entity, scope and
time and whose signature still verifies against that author's recorded key, counts
as admitted even if its author has been revoked since; one altered since fails the
signature and refuses the move. A potentially newer or tied
journal frame not yet considered by materialisation blocks the move; callers must
materialise pending operations before retrying. Retained history can cause a
refusal, but never supplies content to re-author. Invalid or contradictory current
state also fails closed.

The caller supplies a stable `requestId` for retries of one intended move. Local
`syncScopeRebindings` receipts use that id as their primary key, recording source,
destination and the created operation ids. Completed requests return zero without
writing, even after journal compaction, reopening the database or a later move
back. Empty moves also record completion, so retrying cannot sweep up rows added
later. Reusing an id for different scopes is an error. Deliberate subsequent moves
use new request ids; identical source and destination scopes are a no-op.

Frame and attachment encryption and signing finish before one transaction rechecks
saved rows and mutation ids, tombstones, related journal and inbox entries, trust
records and the request receipt. A change raises `ScopeRebindingChangedError`; the
caller may prepare again. Otherwise that same transaction updates local state and
atomically writes the frames, attachment chunks, inbox records (each put applied,
each withdrawal superseded by it) and receipt, and records every retained operation
of a moved entity as settled, so compacting the
move's own frame can never let the sweep put an older version back.
Any write failure rolls everything back. Including `syncInbox` suppresses duplicate
operation-journal middleware emission; ordinary row encryption still applies.

This guarantees local atomicity against the state this device has accepted. It
cannot know unreceived offline edits or make remote delivery atomic. The helper
currently has no production caller or user-facing flow.

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
