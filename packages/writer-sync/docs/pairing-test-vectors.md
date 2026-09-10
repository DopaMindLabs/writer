# Pairing protocol test vectors

Companion to [`pairing-protocol.md`](./pairing-protocol.md). These are the vectors
that do **not** depend on the pending signature-algorithm decision (§9 of that
document): canonical encoding (§3), the transcript hash (§8.1) and the
verification code (§8.2). They are computed from the rules as specified, not
copied from an implementation — no implementation exists yet, which is the point.

The remaining vector classes — signature, key agreement and root wrapper — are
blocked on the runbook §30.1 sign-off and are generated in slice 2A.2/2A.3, along
with the generator script itself and the machine-readable files under
`packages/writer-sync/test/vectors/pairing/`.

Notation: byte strings are shown as UTF-8 source; digests are base64url without
padding.

---

## 1. Canonical encoding

Each case gives the input object, the canonical bytes required by §3, and the
SHA-256 of those bytes so a mismatch is unambiguous.

### 1.1 Key ordering — keys sort by code point, so upper case precedes lower

```
input      {"v":1,"kind":"offer","a":"z","B":"y"}
canonical  {"B":"y","a":"z","kind":"offer","v":1}
sha256     aiblvsoissYo2yEWNEhWKxcrWMJyZ-u2WqnGdHOsDnk
```

### 1.2 No insignificant whitespace; array order preserved

```
input      {"one":1,"two":[1,2,3]}
canonical  {"one":1,"two":[1,2,3]}
sha256     R36_Tp3mU_ivRtx8cX-Cx83L6OUOQCnf6LOweGE4SMQ
```

### 1.3 Minimal escaping — `"` and `\` escaped, tab uses its short form, `U+0001` uses `\u0001`, and `/` is **not** escaped

```
input      {"s":"a\"b\\c\td\u0001e/f"}
canonical  {"s":"a\"b\\c\td\u0001e/f"}
sha256     yq37xzBUXuDoJYypBbVEkDpp1JpA4I0rHJhFAlEBwZc
```

### 1.4 Integer rendering — no sign, no leading zeros, no exponent, up to 2^53 − 1

```
input      {"zero":0,"big":9007199254740991}
canonical  {"big":9007199254740991,"zero":0}
sha256     rvlRxDfm_0cT2XLWOG7eEJvAnemOUgS0ffrHBciPcHY
```

### 1.5 Nested object with an embedded JWK — canonicalised by the same rules at every depth

```
input      {"outer":{"inner":{"crv":"P-256","kty":"EC","x":"AQAB","y":"AQAC"}}}
canonical  {"outer":{"inner":{"crv":"P-256","kty":"EC","x":"AQAB","y":"AQAC"}}}
sha256     13Ug32OBITrZ1JRFtLgFOHMrrTWS47Dk1R6175Ebq58
```

### 1.6 Non-BMP character passes through as UTF-8; array order is significant

```
input      {"emoji":"🗝","order":["b","a"]}
canonical  {"emoji":"🗝","order":["b","a"]}
sha256     WA6aXqvGf5uFlsKic0vrz3uNZ46NxgfjwMqKBj5JTrA
```

Note the pairing with 1.1: `{"order":["a","b"]}` is a *different* value, whereas
`{"b":1,"a":2}` and `{"a":2,"b":1}` are the same value and canonicalise
identically. An implementation that sorts array elements is wrong.

---

## 2. Rejection cases

These must raise `non-canonical` (§13). They parse as JSON but do not re-encode
to the bytes received, so a decoder that verifies a signature over the *parsed*
object rather than the *received* bytes would accept them.

| Received bytes | Why it is rejected |
|---|---|
| `{"a":1, "b":2}` | Whitespace after `,` |
| `{"b":2,"a":1}` | Keys not in code-point order |
| `{"s":"a\/b"}` | `/` escaped unnecessarily |
| `{"s":"\u0041"}` | `A` written as an escape rather than literally |
| `{"n":1.0}` | Non-integer rendering |
| `{"n":+1}` | Not valid JSON at all; must fail before canonicalisation |
| `{"n":01}` | Leading zero |
| `{"a":1,"a":2}` | Duplicate key — reject, never last-wins |

---

## 3. Transcript hash

```
transcript = SHA-256(
  "lipsum-pair-transcript-v1" || 0x00 || <offer bytes> || 0x00 || <answer bytes>
)
```

The offer and answer bytes are treated as opaque here — the transcript is defined
over bytes, so these vectors remain valid whichever signature algorithm §9
settles on.

### 3.1 Empty payloads

```
offer      ""
answer     ""
transcript Mu-NQiwBCcXotiIrnYd-0n9215eK-5_kZM0PoEB_VTU
```

### 3.2 Minimal payloads

```
offer      {"kind":"offer"}
answer     {"kind":"answer"}
transcript g5N3LTe13EKZOs7WBICM2amyDNZoQPlTkDODd6wcnYE
```

### 3.3 Separator sensitivity — the same two byte strings in the other order

```
offer      {"kind":"answer"}
answer     {"kind":"offer"}
transcript PARTDFlGE2OICpdMa21zAfolT9SJkw6BBrj8gW2_tc0
```

Compare with 3.2: swapping the halves changes the digest, which is what the
`0x00` domain separators are there to guarantee.

### 3.4 Representative session

Offer bytes (single line, no whitespace; `\r\n` inside `sdp` are the two-character
JSON escapes, not literal newlines):

```
{"deviceId":"AAECAwQFBgcICQoLDA0ODw","ephemeralJwk":{"crv":"P-256","kty":"EC","x":"eA","y":"eQ"},"expiresAt":1700000120000,"identityJwk":{"crv":"P-256","kty":"EC","x":"aQ","y":"ag"},"kind":"offer","nonce":"EBESExQVFhcYGRobHB0eHw","sdp":"v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n","sessionId":"ICEiIyQlJicoKSorLC0uLw","signature":"c2ln","v":1}
```

Answer bytes:

```
{"deviceId":"MDEyMzQ1Njc4OTo7PD0-Pw","ephemeralJwk":{"crv":"P-256","kty":"EC","x":"ZA","y":"ZQ"},"expiresAt":1700000120000,"identityJwk":{"crv":"P-256","kty":"EC","x":"YQ","y":"Yg"},"kind":"answer","nonce":"QEFCQ0RFRkdISUpLTE1OTw","offerHash":"UFFSU1RVVldYWVpbXF1eXw","sdp":"v=0\r\no=- 2 2 IN IP4 127.0.0.1\r\n","sessionId":"ICEiIyQlJicoKSorLC0uLw","signature":"c2ln","v":1}
```

```
transcript w3dA6dmfOnhdAXsOAlFRTiyUaZnV1CHxpRrGAoHjOjE
```

Both payloads are already in canonical form — note the sorted keys and the
`signature` field included in the hashed bytes, per §8.1. The `signature` value
`c2ln` is a placeholder (`"sig"` in base64url), not a real signature; case 5 in
§15 of the protocol replaces it once the algorithm is chosen.

---

## 4. Verification code

```
sas  = HKDF-SHA-256(ikm = transcript, salt = "", info = "lipsum-pair-sas-v1", L = 4)
code = uint32be(sas) mod 1 000 000, zero-padded to 6 digits
```

The salt is the empty string — zero bytes, not a zero byte — matching the HKDF
usage already in `src/lib/cloud/crypto/keys.ts`.

| Transcript (from §3) | Code |
|---|---|
| `Mu-NQiwBCcXotiIrnYd-0n9215eK-5_kZM0PoEB_VTU` | `237966` |
| `g5N3LTe13EKZOs7WBICM2amyDNZoQPlTkDODd6wcnYE` | `473809` |
| `PARTDFlGE2OICpdMa21zAfolT9SJkw6BBrj8gW2_tc0` | `027941` |
| `w3dA6dmfOnhdAXsOAlFRTiyUaZnV1CHxpRrGAoHjOjE` | `265565` |

The third case exercises zero-padding: an implementation that renders the code as
a plain number shows five digits and disagrees with its peer.
