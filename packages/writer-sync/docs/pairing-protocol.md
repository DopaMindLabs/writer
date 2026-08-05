# Writer Sync pairing protocol

Status: Stage 2A, slice 2A.1. Normative specification for the two-way QR
offer/answer pairing exchange. Written before the implementation exists, per the
runbook's rule that a cryptographic protocol described only by TypeScript must not
merge.

Read alongside [`threat-model.md`](./threat-model.md), which states what each
mechanism here is defending against, and
[`sync-frame-protocol.md`](./sync-frame-protocol.md), which specifies the
operation frames the paired devices exchange afterwards.

Two constants below are marked **pending sign-off**: the device signature
algorithm (§9) and the QR dependency (§6). Both are runbook §30 stop-and-ask
points. The specification records the options and a recommendation; implementation
must not proceed past them without an explicit decision.

---

## 1. Roles, session model and goals

Two devices, **initiator** (A) and **joiner** (B), both belonging to the same
principal. A is already unlocked and holds the root secret; B does not.

The protocol must achieve, in this order:

1. **Mutual authentication** — each end knows the identity key of the other, and
   the user has confirmed that the two ends are the two devices in front of them.
2. **Channel establishment** — a direct WebRTC data channel between exactly those
   two devices.
3. **Root-secret hand-over** — A delivers the root secret to B, sealed so that only B
   can open it.
4. **Durable trust** — both ends record the other in the trusted-device registry,
   so later sessions authenticate without repeating step 3.

Pairing establishes *trust*. Signalling exchanges *connection parameters*. They
share a UI flow and remain separate contracts (`PairingMethod` and
`SignallingAdapter`); nothing in this document may be implemented in a way that
couples them.

A pairing session is short-lived, single-use, and belongs to one pair of devices.
There is no resumption: an expired or failed session is restarted from `idle`.

---

## 2. Version negotiation

```
PAIRING_PROTOCOL_VERSION = 1
```

Every payload carries `v` as its first field. Negotiation is deliberately
minimal — there is exactly one version, and the rule is **strict equality**:

- A payload whose `v` is not exactly the receiver's supported version is rejected
  with `unsupported-version` (§13). It is never partially parsed, and unknown
  fields are never ignored on the assumption that a later version added them.
- A receiver must not attempt to downgrade, and must not accept a payload that
  omits `v`.
- The version is included in the signed canonical encoding and in the transcript,
  so it cannot be stripped or rewritten in transit.

When version 2 exists, the joiner's QR carries the highest version it supports and
the initiator selects; that negotiation is a version-2 concern and must not be
approximated now with permissive parsing.

---

## 3. Canonical encoding

Signatures and the transcript hash are computed over bytes, so the mapping from a
payload to bytes must be exact and reproducible on both ends.

**Canonical JSON**, defined as:

1. UTF-8, no byte-order mark.
2. Object keys sorted by Unicode code point, ascending.
3. No insignificant whitespace — no spaces after `:` or `,`, no newlines.
4. Strings escaped minimally: only `"`, `\` and the control characters
   `U+0000`–`U+001F`, the last as `\u00XX` lower-case hex, except `\b \f \n \r \t`
   which use their short forms. No `\/`, no unnecessary `\uXXXX`.
5. Numbers are integers only, in the range `[0, 2^53 - 1]`, rendered without a
   sign, leading zeros, decimal point or exponent. **No floating-point values
   appear anywhere in this protocol** — timestamps are integer milliseconds.
6. `null`, arrays and nested objects are permitted; array order is significant and
   preserved.
7. Binary values are base64url without padding (`-` and `_`, no `=`). Where a
   field is a JWK, it is embedded as a nested object and canonicalised by the same
   rules.

An encoder must produce this form; a decoder must **re-encode what it parsed and
compare** before verifying a signature. A payload whose canonical re-encoding
differs from the bytes received is rejected with `non-canonical` — this closes
the gap where two distinct byte strings parse to the same object and only one was
signed.

---

## 4. Message schemas

Two payload kinds. Both share a common header.

### 4.1 Common fields

| Field | Type | Notes |
|---|---|---|
| `v` | integer | Exactly `1` (§2) |
| `sessionId` | base64url, 16 bytes | CSPRNG; minted by the initiator, echoed by the joiner |
| `kind` | `"offer"` \| `"answer"` | Payload role |
| `deviceId` | string | The sending device's id, derived from its identity key (§9) |
| `identityJwk` | JWK | The sending device's **public** identity key |
| `ephemeralJwk` | JWK | The sending device's **public** ephemeral pairing key (§10), fresh per session |
| `sdp` | string | The complete gathered session description for this role |
| `nonce` | base64url, 16 bytes | CSPRNG, single use (§7) |
| `expiresAt` | integer | Absolute expiry, milliseconds since the Unix epoch |
| `signature` | base64url | Over the canonical encoding of every other field (§9) |

`identityJwk` carries only the public parameters required by the chosen algorithm.
A JWK containing a private component (`d`), or any member not required by the
algorithm, is rejected with `malformed-payload` rather than filtered — a payload
that tried to send a private key is evidence of a bug or an attack, not something
to clean up.

### 4.2 Offer

`kind: "offer"`. Sent by the initiator. `sdp` is A's complete offer with ICE
gathering finished (§5).

### 4.3 Answer

`kind: "answer"`. Sent by the joiner. Adds:

| Field | Type | Notes |
|---|---|---|
| `offerHash` | base64url, 32 bytes | SHA-256 of the canonical offer bytes the joiner actually consumed |

`offerHash` is what makes substitution detectable at the initiator: A recomputes
the hash of the offer it sent and rejects an answer that binds to a different one
(`transcript-mismatch`). Without it, A learns of a mismatch only from the
verification code, which depends on the user.

### 4.4 Device display name

A device's friendly name is **not** part of either payload. It is presentation
metadata, exchanged over the authenticated data channel after the session is
established, and rendered as text — never as markup. Putting it in the QR would
consume scarce payload budget and give an attacker a free, pre-authentication
string in the user's field of view.

---

## 5. ICE gathering

The `sdp` field carries the session description for its role in **one** payload,
with local ICE gathering settled before encoding. Trickle ICE through repeated QR
updates is prohibited: it multiplies the number of scans, and each additional
scan is another chance for the user to accept a substituted payload.

Gathering is bounded by a deadline (`ICE_GATHERING_TIMEOUT_MILLIS`). Reaching the
deadline is not itself a failure: an implementation encodes whatever candidates
the description holds at that point, provided it holds at least one. Gathering
routinely stalls short of `complete` on hosts where the browser's mDNS responder
cannot bind, long after the host candidates a local pair needs have arrived, and
a pair that would have worked must not be refused over that.

Stage 2A configures empty `iceServers`. No hosted endpoint is called, and there is
no silent fallback to a public STUN server. A device that reaches the deadline
with **no** candidate at all, or that cannot reach its peer on the local network,
reports a typed `local-connectivity` failure (§13) rather than waiting.

---

## 6. Size limits and QR carriage

| Limit | Value | Rationale |
|---|---|---|
| `MAX_PAYLOAD_BYTES` | 8192 | Canonical JSON, before compression. A ceiling on parser and buffer work. |
| `MAX_SDP_BYTES` | 6144 | The dominant field; bounds the rest by subtraction. |
| `MAX_JWK_BYTES` | 512 | Per JWK, both `identityJwk` and `ephemeralJwk`. |
| `MAX_QR_CHUNK_BYTES` | 2600 | Encoded text per QR symbol; a typical offer fits one symbol, with headroom under the 2953-char version-40/EC-L encoder ceiling for the part prefix. |
| `MAX_QR_PARTS` | 8 | Bounded, ordered sequence. |
| `SESSION_TTL_MILLIS` | 300 000 | Default validity (§7); sized for the photograph-and-paste path, which routinely outlives a shorter window. |
| `MAX_SESSION_TTL_MILLIS` | 300 000 | Hard ceiling on `expiresAt`. |

**Carriage.** The canonical bytes are DEFLATE-compressed (raw, no zlib wrapper)
and then base64url-encoded without padding. Compression before encoding is safe
here because the payload holds no confidential material (threat model §5.1), and
SDP compresses well.

If the encoded text exceeds `MAX_QR_CHUNK_BYTES`, it is split into a bounded,
ordered sequence of at most `MAX_QR_PARTS` symbols, each prefixed
`W1:<sessionId>:<index>/<total>:`. A receiver accepts parts only for one session
id, requires every index exactly once, and rejects a set whose `total` disagrees
between parts. Reassembly happens before any parsing, and the reassembled text is
subject to `MAX_PAYLOAD_BYTES` after decompression — a decompression bomb is
rejected by streaming with a hard output ceiling, not by trusting the declared
size.

Payloads must never be truncated, and validation must never be relaxed to make one
fit. Where multi-part scanning is impractical, the file/copy fallback carries the
same bytes.

> **Pending sign-off (runbook §30.2).** The QR encoder, the scanner, and the
> fallback where `BarcodeDetector` is unavailable are a stop-and-ask decision. The
> ADR must measure *real* offer and answer payload sizes across the supported
> browsers before `MAX_QR_CHUNK_BYTES` and `MAX_QR_PARTS` are treated as settled,
> and must state the camera permission flow, the file-image fallback and the
> accessibility fallback for users who cannot operate a camera.

---

## 7. Expiry, nonces and clock skew

- `expiresAt` is absolute and must satisfy
  `now < expiresAt <= now + MAX_SESSION_TTL_MILLIS + MAX_CLOCK_SKEW_MILLIS`.
- `MAX_CLOCK_SKEW_MILLIS = 60 000`. A payload appearing to come from the future by
  more than this is rejected with `expired` rather than accepted optimistically;
  the two devices are metres apart and a minute of tolerance is generous.
- `nonce` is 16 CSPRNG bytes, single use, checked against the replay cache (§14).
- `sessionId` is 16 CSPRNG bytes, minted by the initiator. The joiner echoes it;
  an answer whose `sessionId` differs from the offer's is rejected with
  `session-mismatch`.
- Expiry is evaluated **once, at acceptance**, and again before the root secret is
  wrapped. A session that expires mid-flow fails to `expired`; it does not
  continue on the grounds that it was valid when it started.

---

## 8. Transcript binding and the verification code

### 8.1 Transcript

```
transcript = SHA-256(
  "lipsum-pair-transcript-v1" || 0x00 ||
  canonical(offer)            || 0x00 ||
  canonical(answer)
)
```

`canonical(offer)` and `canonical(answer)` are the complete canonical byte strings
**including** each payload's own `signature` field. The `0x00` separators are
domain separators so that no rearrangement of the two payloads produces the same
input.

The transcript is computed independently on both devices and is the input to the
verification code (§8.2), to the pairing key agreement (§10) and to the AAD of the
root-secret hand-over wrapper (§11). A substituted payload therefore diverges the
transcript, which in turn breaks the code, the derived key and the wrapper — three
independent detections, not one.

### 8.2 Verification code

```
sas = HKDF-SHA-256(
  ikm  = transcript,
  salt = "",
  info = "lipsum-pair-sas-v1",
  L    = 4 bytes
)
code = (uint32be(sas) mod 1 000 000), rendered as 6 decimal digits, zero-padded
```

Displayed on both devices. The user confirms the codes match before pairing
proceeds. This is the mechanism that defeats the strongest Stage 2A attack — an
observer who photographs the offer and races the legitimate joiner (threat model
§5.4).

**On 6 digits.** An attacker gets one attempt: the session is single-use, the
nonce is cached, and the expiry is five minutes. A one-in-a-million chance per
session, with no ability to retry against the same user without their visible
cooperation, is proportionate. A longer code costs comparison accuracy, and a code
users do not actually compare is worth nothing.

The code is derived, never transmitted. A payload field carrying it would let an
attacker display the value the user expects.

### 8.3 Binding to the WebRTC session

The transcript is bound into the established session: the data channel is not
handed to the sync layer until both ends have proved possession of the
transcript-derived key (§10). DTLS protects the transport; it does not identify
the peer. Application frames stay independently encrypted and device-signed
regardless — the channel is a bearer, not a trust boundary.

---

## 9. Device identity and signatures

Each device holds a persistent signing identity, created on first use, private
half non-extractable where the platform permits. The device id is **derived from
the identity key**, not minted independently:

```
deviceId = base64url( SHA-256("lipsum-device-id-v1" || 0x00 || spki(identityPublicKey))[0..15] )
```

128 bits of a hash over the SPKI encoding of the public key. Deriving rather than
minting means a device cannot claim another's id without its key, and the
registry's `deviceId` and `publicIdentityKey` columns cannot disagree.

Signature input, with domain separation so a pairing signature can never be
replayed as a signature over anything else:

```
signingInput = "lipsum-pair-sign-v1" || 0x00 || canonical(payload minus "signature")
```

Verification order on receipt, all before any state changes:

1. Structural validation and canonical re-encoding check (§3).
2. Version, session id, expiry, nonce (§2, §7).
3. Derive the peer's `deviceId` from `identityJwk` and require it to equal the
   payload's `deviceId`.
4. Verify `signature` over `signingInput` with `identityJwk`.
5. For an answer, verify `offerHash`.

A self-signed payload proves only self-consistency — an attacker signs their own
payload with their own key perfectly well. Step 4 is what binds the *rest* of the
payload to the key in it; §8.2 is what binds that key to the device the user
means.

> **Pending sign-off (runbook §30.1).** The signature algorithm is a stop-and-ask.
>
> - **ECDSA P-256 with SHA-256** — available in `crypto.subtle` in every browser
>   Writer supports, needs no dependency, and matches the P-256 ECDH the vault
>   already uses for `wrapRootSecretForPairing`, so one curve covers both. Its
>   costs are real: signatures need a good CSPRNG per operation, and the encoding
>   has more room for implementation error than the alternative.
> - **Ed25519** — smaller keys and signatures (a material saving against the QR
>   budget in §6), deterministic, harder to misuse. Web Crypto support arrived
>   later and is not uniform across the browser matrix; a polyfill would be a new
>   cryptographic dependency needing its own audit and licence review.
>
> **Recommendation: ECDSA P-256 with SHA-256**, on the grounds that it adds no
> dependency and reuses the curve already in the vault. This is a recommendation,
> not a decision. Until it is signed off, no signing code lands.

---

## 10. Ephemeral key agreement and derivation labels

Each device generates a **fresh** ECDH key pair per pairing session — never
reused, never persisted, discarded when the session leaves `complete`, `failed`,
`expired` or `cancelled`. The public half travels as `ephemeralJwk`.

```
curve         = P-256
sharedSecret  = ECDH(ownEphemeralPrivate, peerEphemeralPublic)
pairingKey    = HKDF-SHA-256(
                  ikm  = sharedSecret,
                  salt = transcript,
                  info = "lipsum-pair-key-v1",
                  L    = 32 bytes
                ) -> AES-256-GCM, non-extractable
```

Using the transcript as the HKDF salt is what makes the derived key
transcript-bound: two devices that saw different payloads derive different keys
and simply cannot talk, without relying on anyone noticing a mismatch.

Derivation labels used by this protocol, all versioned, matching the existing
`lipsum-*-v1` convention:

| Label | Purpose |
|---|---|
| `lipsum-pair-transcript-v1` | Transcript hash domain (§8.1) |
| `lipsum-pair-sas-v1` | Verification code (§8.2) |
| `lipsum-pair-sign-v1` | Payload signature domain (§9) |
| `lipsum-device-id-v1` | Device id derivation (§9) |
| `lipsum-pair-key-v1` | Pairing transfer key (this section) |
| `lipsum-pair-root-v1` | Root-secret hand-over wrapper AAD (§11) |

These sit beside the labels Stage 1 already uses — `lipsum-content-v1`,
`lipsum-keycheck-v1` and the `lipsum-op` frame AAD prefix — and must stay
disjoint from them.

> **Required change to implemented code.** `deviceKeyVault.ts` currently derives
> the pairing key by passing the ECDH result straight to `deriveKey` as AES-GCM,
> with no HKDF step, no salt and no info label. That is sound in isolation but has
> no transcript binding and no domain separation. Slice 2A.2 must extend it to the
> derivation above. This is a change to reviewed cryptographic code and is part of
> the §30.1 sign-off, not a refactor to be slipped in.

---

## 11. Encrypted root-secret hand-over wrapper

The initiator wraps the root secret for the joiner. The wire form already exists
as `PairingRootWrapper`:

```ts
interface PairingRootWrapper {
  ephemeralPublicJwk: JsonWebKey;  // the wrapping device's ephemeral public key
  iv: string;                      // AES-GCM iv, base64
  wrapped: string;                 // the root secret, AES-GCM sealed, base64
}
```

and `wrapRootSecretForPairing` implements it with ECDH P-256 plus AES-256-GCM.
The joining half, `unwrapPairingRoot`, exists and is exercised by the vault's test
suite; slice 2A.2 gives it its first real caller.

**Rules.**

- The wrapper travels over the **established, authenticated data channel**. It
  never appears in a QR payload, in any form, at any size.
- It is produced only after the `awaiting-confirmation` state has been satisfied by
  an explicit user action (§12) — never on connectivity alone.
- The root is zeroed in memory immediately after wrapping. The existing
  implementation does this (`root.fill(0)`); it must stay.
- The wrapper is single-use, bound to one session id, and rejected if the session
  has since expired. The expiry the session was authenticated with travels on
  `AuthenticatedPeerParameters` and is the **earlier of the two signed
  deadlines**: each half of the exchange carries its own, and adopting the
  peer's alone would let an answer minted late hand the initiator a fresh window
  for a code that was nearly out. Both ends therefore bind the same instant.
- Expiry is terminal. The boundary that seals the root refuses, the ephemeral
  private key is let go so a wrapper arriving late cannot be opened either, the
  adapter is disposed, the channel closes, catch-up does not start, and trust
  this pairing created is forgotten — a device the registry vouches for on the
  strength of a handover that never happened is worse than no record at all. A
  record that existed before the pairing is left alone. The session moves to
  `expired`; a fresh QR exchange is what moves key material now.
- On success the joiner stores the root through `storeRootSecret`, bound to its
  own device id and the principal id, and derives its key ring exactly as a device
  that had unlocked by passphrase would. There is no separate "paired device" key
  path.

> **Required change to implemented code.** The AES-GCM call in `wrapForPairing`
> passes no `additionalData`, so the wrapper is not bound to the pairing
> transcript. Slice 2A.2 must add
> `additionalData = "lipsum-pair-root-v1" || 0x00 || transcript` to both the wrap
> and the unwrap, so that a wrapper captured from one session cannot be replayed
> into another. Both `wrapRootSecretForPairing` and `unwrapPairingRoot` change
> together, and the vault's tests change with them.

---

## 12. States and confirmation

```ts
type PairingState =
  | 'idle'
  | 'creating'
  | 'awaiting-peer'
  | 'authenticating'
  | 'awaiting-confirmation'
  | 'transferring-keys'
  | 'complete'
  | 'expired'
  | 'cancelled'
  | 'failed';
```

Initiator and joiner are **separate session types** sharing this state set. Every
transition validates the prior state; an event arriving in the wrong state is a
typed error, never a no-op retry.

Initiator: `idle → creating → awaiting-peer → authenticating → awaiting-confirmation → transferring-keys → complete`.

Joiner: `idle → awaiting-peer → creating → authenticating → awaiting-confirmation → transferring-keys → complete`.

From any non-terminal state: `→ expired` on the expiry check, `→ cancelled` on
user cancellation, `→ failed` on a typed error. All four terminal states discard
the ephemeral private key and clear the session's transcript.

**`awaiting-confirmation` is load-bearing.** It is entered after mutual signature
verification and transcript agreement, and left only on an explicit user action
taken while the verification code is displayed on both devices. It must not be
entered automatically, skipped when a trusted-device record already exists during
*initial* pairing, or satisfied by a timeout. Key transfer happens in the state
after it, never before.

**Reconnection.** A later session between already-trusted devices repeats the
two-way QR exchange — a closed browser page leaves no listener to rediscover — but
authenticates against the stored device identities and **skips
`transferring-keys`** entirely. The registry record is the proof; the root secret
is never sent twice.

**Re-pairing a removed device.** A completed exchange with a device whose
registry record is revoked **refreshes trust**: the record is reactivated if —
and only if — the presented identity key equals the stored one, member for
member over `kty`/`crv`/`x`/`y`. The confirmation step is the authorisation:
the same human checkpoint that established trust originally is passed again,
and strictly more evidence is demanded than first pairing required (a
completed, validated exchange *and* the identical stored key). A known device
id presenting any other key fails with `trusted-key-mismatch` and the record —
including its revocation — is left untouched: that is key substitution, not
reconnection, whatever the payload's self-consistent id-to-key derivation
claims.

---

## 13. Error codes

Typed, stable, and safe to log. Every failure maps to exactly one.

| Code | Meaning |
|---|---|
| `unsupported-version` | `v` is not the supported version |
| `malformed-payload` | Structural validation failed, or a JWK carried unexpected members |
| `non-canonical` | Re-encoding did not reproduce the bytes received |
| `oversized-payload` | A size limit in §6 was exceeded |
| `bad-qr-sequence` | Missing, duplicated or inconsistent multi-part symbols |
| `expired` | `expiresAt` has passed, or is beyond the permitted skew |
| `replayed-nonce` | The nonce is in the replay cache |
| `session-mismatch` | `sessionId` does not match the session in progress |
| `identity-mismatch` | `deviceId` does not equal the value derived from `identityJwk` |
| `bad-signature` | Signature verification failed |
| `transcript-mismatch` | `offerHash` or the transcript disagreed between ends |
| `unconfirmed` | Key transfer was attempted before user confirmation |
| `trusted-key-mismatch` | A known device id presented an identity key that differs from the stored one |
| `local-connectivity` | No data channel could be established on the local network |
| `invalid-state` | An event arrived in a state that does not accept it |
| `cancelled` | The user cancelled |

Messages shown to users must not embed raw payload contents; a peer-supplied
string in an error dialog is untrusted text (threat model §5.11).

---

## 14. Replay cache

Bounded, device-local, and unsynced.

- **Key:** `nonce`. **Value:** `sessionId` and `expiresAt`.
- An entry is retained until `expiresAt + MAX_CLOCK_SKEW_MILLIS`, then evicted; a
  nonce cannot be replayed while its payload could still be considered valid, and
  nothing is retained beyond that.
- **Capacity:** 256 entries, evicting the earliest `expiresAt` first. The cache is
  a defence against replay, not a log — an attacker who floods it evicts only
  entries that are about to become unusable anyway, and each flood attempt is a
  fresh session the user must physically accept.
- Insertion happens **before** the payload is acted on, so a duplicate racing the
  original loses.
- The cache holds nonces only. It must not accumulate device identifiers, session
  descriptions or timings beyond `expiresAt` — the registry is where durable
  device facts live, and no user agent or fingerprinting data is stored anywhere
  (runbook §19).

---

## 15. Test vectors

Vectors are part of the specification, not of the test suite: an implementation
that changes its canonical encoding must fail against a committed file rather than
against a regenerated expectation.

`packages/writer-sync/test/vectors/pairing/` carries, one JSON file per case:

**Available now** — these depend only on §3 and §8.1, which are settled:

1. `canonical-encoding` — object-to-bytes cases covering key ordering, escaping,
   integer rendering, nested objects and JWK embedding.
2. `canonical-rejection` — byte strings that parse but do not re-encode
   identically, each expected to raise `non-canonical`.
3. `transcript` — offer/answer byte pairs with their expected transcript hash.
4. `verification-code` — transcripts with their expected six-digit code.

Concrete values for cases 1 to 4 are in
[`pairing-test-vectors.md`](./pairing-test-vectors.md), computed from the rules
above.

**Blocked on the §9 sign-off** — these depend on the signature algorithm and must
be generated once it is chosen:

5. `signature` — fixed key pair, payload, expected signature and verification
   outcome, plus mutation cases that must fail.
6. `key-agreement` — fixed ephemeral key pairs and transcript, expected derived
   pairing key.
7. `root-wrapper` — fixed pairing key, root and iv, expected wrapper, plus a
   wrapper from a different transcript that must fail to unwrap.

Every vector file records the label and version it exercises, so a label change is
visible in the diff.

---

## 16. What this protocol does not do

Stated so that no implementation quietly assumes otherwise.

- It does not make an offline peer reachable. A trusted-device record is not a
  connection, and Stage 2A has no background delivery.
- It does not survive a closed page. Both browsers must be open, on the same
  network, with a user present at each.
- It does not revoke. Removing a device blocks new sessions and stops new key
  delivery; it cannot recall data or keys already copied (threat model §5.9).
  Removal is reversed only by a fresh, human-confirmed pairing proving the same
  identity key (§12, "Re-pairing a removed device").
- It does not cross principals. Everything here assumes both devices belong to the
  same account; cross-user scopes are a stop-and-ask (runbook §30.6).
- It does not replace Dexie Cloud. Cloud sync may remain enabled independently,
  and the operation frames both carry are identical.
