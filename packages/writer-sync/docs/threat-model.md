# Writer Sync threat model

Status: Stage 2A, slice 2A.1. This document is normative for the QR-paired
peer-to-peer release and is written before any pairing dependency or UI exists, so
that the code that follows is judged against it rather than describing itself.

Where a mitigation already exists it is named with the module that provides it —
Stage 1 fixed the operation frame format, its scope binding and its deduplication
rules, and this model records those as delivered rather than proposing them again.

---

## 1. Scope

**In scope.** Two devices belonging to the *same principal*, pairing over a local
network through a two-way QR offer/answer exchange, with no internet service
operated by Writer; and the encrypted operation frames those devices exchange
afterwards.

**Out of scope, deliberately.**

- Hosted signalling, STUN and TURN. Stage 2B introduces a relay operated by
  somebody, which changes the metadata exposure and the availability threats
  materially. It gets its own threat model; §5.12 records only the boundary.
- Cross-user scopes. Sharing a scope between principals requires per-scope member
  key wrapping, revocation and a group protocol, and is a stop-and-ask decision
  (runbook §30.6) that no Stage 2A code may pre-empt.
- Any promise of erasure. Data already copied to a device that is offline cannot
  be recalled (runbook §30.7). §5.10 states what device removal does and does not
  achieve.
- Attackers with privileged code execution on the host operating system, and
  attackers with physical access to an unlocked device. A browser-resident
  application cannot defend against either; both are stated as residual (§6).

---

## 2. Assets

| Asset | Where it lives | Exposure if lost |
|---|---|---|
| Account root (32 bytes of CSPRNG output) | `DeviceKeyVault`, AES-GCM-wrapped under a non-extractable device wrapping key, in a dedicated never-synced database | Every scope's content, on every device, past and future |
| Content key ring (AES-256-GCM, non-extractable) | Derived per epoch by HKDF-SHA-256 from the root | All content sealed under that epoch |
| Device signing identity (private half) | Slice 2A.2, non-extractable where the platform permits | Ability to impersonate a trusted device |
| Ephemeral pairing ECDH private key | Memory, one pairing session only | The account root, if the wrapper is also captured |
| Entity content | Frame payload, AES-GCM-sealed | The user's documents |
| Attribution (`createdBy` / `updatedBy`) | Sealed *inside* the payload, never in the header | Who wrote what |
| Routing header | Plaintext to every provider: scope id, entity table and id, kind, device id, logical time, key id, epoch, payload hash | Structural metadata — see §5.12 |
| Trusted-device registry | Local Writer table (slice 2A.2) | Which devices this principal has paired |

The header is plaintext by design: a provider has to route without reading. The
disclosure boundary is documented on `SyncOperationHeader` and must not widen —
in particular the acting principal stays inside the payload.

---

## 3. Trust boundaries

1. **Vault ↔ application.** The raw account root exists only transiently inside
   vault operations and never crosses the public API. Callers receive a
   non-extractable `CryptoKey` or a wrapper, never bytes.
2. **Device ↔ QR channel.** Optical, out-of-band, and *observable by anyone who
   can see the screen*. The QR channel is treated as public and unauthenticated:
   confidential material must never appear in it, and integrity comes from what
   the payload carries, not from the medium.
3. **Device ↔ peer.** DTLS protects the WebRTC transport, but DTLS alone proves
   nothing about *which* peer is on the far end. Peer identity is established by
   the authenticated pairing transcript, not by the connection.
4. **Engine ↔ provider.** Every provider — Dexie Cloud, a WebRTC peer, a future
   relay — is untrusted. It may drop, delay, reorder, duplicate or alter what it
   carries. It sees the header and opaque ciphertext, nothing else.
5. **Page ↔ origin.** Script running in the application's origin is inside the
   trust boundary of the browser's crypto store; see §5.11.

---

## 4. Attacker capabilities considered

- **Optical observer** — has line of sight to a screen, or a photograph of it,
  and can decode any QR shown.
- **Local network attacker** — can send and receive on the same LAN, observe
  connection metadata, and attempt to present itself as the intended peer.
- **Hostile provider** — full control of what a provider delivers, including
  replay, reordering, mutation, and injection of frames it authored.
- **Former holder of a paired device** — has, or had, a device that completed
  pairing.
- **Script in the application origin** — an XSS foothold, subject to the same
  browser API surface as the application.

A global passive network observer is out of scope for Stage 2A because Stage 2A
sends nothing across the internet.

---

## 5. Threats

### 5.1 QR copied or photographed

*Capability:* optical observer.

A QR shown during pairing may be photographed, screen-shared or shoulder-surfed.

**Mitigation.** The payload carries no passphrase, no recovery code, no account
root and no content key — only a protocol version, a session id, the initiator's
device id and public identity material, an ephemeral pairing *public* key, the
payload kind, the gathered session description, an expiry, a nonce and integrity
data. Capturing it therefore yields no key material.

What capture *does* enable is an attempt to answer the offer first, which is
threat 5.4. The mitigations there — transcript binding, a short verification code
compared on both screens, and explicit user confirmation before any key transfer —
are what make a photographed offer useless rather than merely inconvenient.

**Status.** Payload contents constrained by the pairing protocol specification
(slice 2A.1); enforcement lands in 2A.3.

### 5.2 Expired or replayed pairing session

*Capability:* optical observer, local network attacker.

A payload captured now and presented later, or presented twice.

**Mitigation.** Every payload carries an absolute expiry and a random single-use
nonce. A session id is accepted once; the replay cache (pairing protocol §11)
rejects a second presentation of the same nonce for as long as the payload could
still be valid. The state machine validates the prior state on every transition,
so a payload arriving in the wrong phase is a typed error rather than a retry.

**Status.** Specified in 2A.1; enforced by the state machine in 2A.3.

### 5.3 Forged, altered or substituted offer or answer payload

*Capability:* optical observer, local network attacker.

An attacker substitutes their own session description, or edits a field of a
legitimate payload, so that the connection terminates at them.

**Mitigation.** Each payload is signed by the device identity key whose public
half the payload itself carries, over a canonical encoding of every field. A
mutated field fails signature verification. Unknown mandatory fields and
malformed base encodings are rejected outright rather than ignored. Because the
signature only proves *self-consistency* — the attacker can sign their own
payload with their own key — the signature is not sufficient on its own; it is
the verification code of 5.4 that binds the payload to the device the user
intends.

**Status.** Specified in 2A.1; signing lands in 2A.2, validation in 2A.3.

### 5.4 Local-network peer impersonation and WebRTC MITM through an altered transcript

*Capability:* optical observer plus local network attacker.

The strongest threat in Stage 2A. An attacker who photographs the offer QR races
the legitimate joiner, returns their own answer, and — if accepted — receives the
wrapped account root.

**Mitigation, in layers.**

1. **Transcript binding.** Both payloads, in full and in canonical form, are hashed
   into a single pairing transcript. The transcript is bound into the key
   agreement and into the WebRTC session; a substituted answer produces a
   different transcript on the two ends.
2. **Verification code.** A short authentication string is derived from the
   transcript and displayed on *both* devices. The user confirms they match. An
   attacker who substituted a payload cannot produce the same code on the screen
   the user is comparing against.
3. **Explicit confirmation before key transfer.** Device A wraps the account root
   only after the user confirms the named device. Confirmation is a distinct
   state (`awaiting-confirmation`), never implied by connectivity.

The verification code is a requirement of this threat model, not an optional
usability affordance: without it, transcript binding detects a *mismatch between
the two devices* but nothing tells the user which of the two is theirs.

**Status.** Specified in 2A.1; implemented across 2A.2–2A.5. Real two-device
verification is owed by 2A.9 — a mocked WebRTC test does not discharge this
threat.

### 5.5 Untrusted inbound operation

*Capability:* hostile provider, local network attacker.

A frame arrives claiming any shape at all.

**Mitigation — delivered in Stage 1.** `decodeFrame` validates every field's type
and non-emptiness and rejects an unsupported protocol version; `verifyFrame`
recomputes the SHA-256 payload hash and rejects a mismatch before anything looks
inside the ciphertext. The AES-GCM AAD binds the payload to its routing header —
operation id, scope, entity table and id, kind, device id, logical time, key id
and epoch — so a header altered in transit fails authentication at decryption.
Logical time is bound deliberately: it decides which write wins, so a transport
able to retime a frame without invalidating it could force stale content over new.

**Outstanding for Stage 2A.** The frame is authenticated *as content* but not yet
attributed *to a device*: `signature` is written empty by Stage 1. Until 2A.2
fills it, any peer holding the content key could author a frame naming another
device. Signing and verification against the trusted-device registry closes this.

### 5.6 Operation replay

*Capability:* hostile provider.

The same operation delivered repeatedly, or an old operation re-delivered after
newer state exists.

**Mitigation — delivered in Stage 1.** `applyInboundFrame` checks and writes
`syncInbox` inside the same transaction as materialisation, so an already-accepted
operation id returns its recorded result and touches nothing. Beyond exact replay,
convergence is decided by hybrid logical time, then device id, then operation id —
never by provider arrival order — so a re-delivered older operation loses
deterministically on every device. Deletions are ordered by the same rule, and a
tombstone prevents a stale `put` from resurrecting a deleted entity.

An accepted frame's logical time merges into the local clock only within
`MAX_OBSERVED_DRIFT_MILLIS` (five minutes), so a peer with a broken or hostile
clock cannot push this device's clock forward and poison every later local edit.

### 5.7 Wrong-scope frame

*Capability:* hostile provider, paired peer.

A frame relabelled into a scope the receiver did not expect.

**Mitigation — delivered in Stage 1.** The scope id is inside the AAD, so
relabelling invalidates the payload; and `verifyFrame({ expectedScope })` rejects
a mismatch structurally, before decryption. Moving content legitimately between
scopes goes through `rescopeFrames`, which opens under the source key and reseals
under the destination, all or nothing.

### 5.8 Malicious attachment size or chunk count

*Capability:* paired peer, hostile provider.

An `AttachmentChunkManifest` declaring an implausible `totalBytes`, `chunkCount`
or `chunkHashes` length, aiming at memory exhaustion or unbounded storage.

**Mitigation.** The manifest is untrusted input and gets the same treatment as a
frame: absolute ceilings on `totalBytes`, `chunkBytes` and `chunkCount`, and a
consistency check that `chunkCount` equals `chunkHashes.length` and agrees with
`ceil(totalBytes / chunkBytes)`. Each chunk is verified against its own hash on
arrival, and the assembled content against `contentHash`; a chunk that fails is
discarded without being written. Storage is committed incrementally so an aborted
transfer cannot be used to reserve the ceiling.

**Status.** Declared but unimplemented at end of Stage 1. Lands in 2A.7; the
ceilings must be chosen there and stated in the protocol specification.

### 5.9 Compromised trusted device

*Capability:* former holder of a paired device.

The device holds the account root and can decrypt everything the principal owns.

**Mitigation.** Limited, and this must be stated honestly to users. Removal blocks
new authenticated sessions from that device and stops new key delivery, but it
cannot delete data or keys already copied there, and it is **not** cryptographic
revocation until the scope or account keys rotate. The key ring is already
epoch-based, which is the seam rotation would use; rotation itself is not in
Stage 2A.

**Status.** Removal semantics land in 2A.2 and must be reflected in UI copy and
help content in 2A.8, not only in this document.

### 5.10 Removed device reconnecting

*Capability:* former holder of a paired device.

**Mitigation.** Authentication is against the trusted-device registry, and a
removed or revoked record fails it — a stored record is not the same as an
accepted one. Because Stage 2A has no listener while a page is closed, every
later session repeats the two-way QR exchange, which is itself a checkpoint: a
removed device cannot reconnect without a user standing at both screens.

That checkpoint is also the one path back. A *completed* pairing — payloads
validated, transcripts agreed, digits confirmed by a human on both screens —
refreshes a revoked record to active, if and only if the presented identity key
equals the stored one. The six-digit comparison is the same human authorisation
that established trust originally, and refresh demands strictly more evidence
than first pairing did: a completed validated exchange *and* the identical
stored key. A known device id under any other key fails with
`trusted-key-mismatch` and touches nothing; only the side holding the revoked
record detects this — the peer's own exchange completes and then loses the
connection, which is acceptable for an event of this class.

The registry keeps `status` and `revokedTime`, so a removed record is retained
rather than deleted; deleting it would let the same identity re-pair as though
it were new — and retention is also what makes "same identity" checkable when a
removed device asks back in.

### 5.11 Cross-site scripting using keys in the browser

*Capability:* script in the application origin.

**Mitigation, and its limit.** Key material is non-extractable throughout: the
device wrapping key, the derived content key and the device signing key are
generated with `extractable: false` and stored by structured clone, so injected
script cannot exfiltrate *bytes*. It can, however, call the same APIs the
application can — meaning it could ask the vault to seal or open payloads for as
long as the page is alive. Non-extractability limits the blast radius to the
session; it does not eliminate it.

The real mitigation is not letting script in: no `dangerouslySetInnerHTML` on
synced content, no evaluation of received payloads, strict validation of every
inbound field, and no reflection of peer-supplied strings into markup. A device
display name arriving from a peer is presentation metadata and untrusted text —
render it as text, never as markup.

### 5.12 Local-network metadata exposure

*Capability:* local network attacker.

WebRTC discloses host candidates: local IP addresses, and the fact that two
devices are exchanging data. Content stays sealed, but the *existence* and timing
of a session are visible on the LAN, and the routing header is visible to the
peer.

**Mitigation.** Decoding is local: the scanner's WASM engine is served by the
host application rather than fetched from a CDN, so reading a code tells no
third party that a pairing is happening. Stage 2A configures empty `iceServers` and settles local ICE
gathering before encoding the QR, so nothing is sent to a third party and no
public STUN server is contacted as a silent fallback. The gathering deadline
(pairing protocol §5) only ever releases candidates already gathered locally; it
never widens where they were gathered from. This bounds exposure to the
local network the user is already on.

**Deferred.** Signalling, STUN and TURN metadata exposure belongs to the Stage 2B
threat model, where a relay operator can observe pairs of endpoints over time.
Stage 2A must not add a hosted endpoint to make connectivity easier.

### 5.13 Denial of service through message flood or reconnection loop

*Capability:* paired peer, local network attacker.

An open data channel that floods frames, or a peer that reconnects in a tight
loop, exhausting CPU (every frame costs AES-GCM plus SHA-256), memory or storage.

**Mitigation.** Bounded application frame sizes; backpressure through
`bufferedAmount` and `bufferedamountlow` rather than unbounded queueing; reconnect
with bounded exponential backoff and jitter, and no write-on-settle loop; typed
timeout and client-isolation failures instead of an infinite connecting state.
Inbound frames are rate-limited per peer, and a peer exceeding it has its session
closed rather than its frames silently dropped, so the failure is observable.

**Status.** Transport requirements land in 2A.5; the rate limit must be stated in
the protocol specification with its chosen constant.

---

## 6. Residual risks

Recorded so they are not mistaken for oversights.

- **A compromised or coerced device cannot be un-copied.** §5.9. Rotation, not
  removal, is the eventual answer, and it is not in Stage 2A.
- **XSS in the application origin can use keys for the life of the page.** §5.11.
- **The user is the final authentication step.** The verification code works only
  if it is actually compared. UI copy must make skipping it feel wrong.
- **Header metadata is visible to every provider.** By design; the mitigation is
  keeping the header minimal, not encrypting it.
- **No real-hardware verification exists at the time of writing.** Stage 1 ran
  headless Chromium only. Every claim here about WebRTC behaviour is a
  specification, not an observation, until 2A.9.

---

## 7. Decisions this model defers

These are runbook §30 stop-and-ask points. Nothing in Stage 2A may settle them
unilaterally:

1. The device signature algorithm and any cryptographic dependency (§30.1). The
   pairing protocol specification records the options and a recommendation; the
   choice needs sign-off.
2. The QR encoder and scanner dependency, including the accessibility fallback
   where `BarcodeDetector` is unavailable (§30.2).
3. Hosted signalling, STUN and TURN for Stage 2B (§30.3).
4. Any native rendezvous host integration (§30.4).
5. Any cross-user scope (§30.6) and any promise of erasure (§30.7).
