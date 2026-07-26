# ADR 0001 — QR encoding and scanning dependencies

- **Status:** accepted (user sign-off, 2026-07-26; runbook §30.2 stop-and-ask)
- **Stage:** Writer Sync 2A, slice 2A.3 preparation
- **Decision:** add `uqr` (generation) and `barcode-detector` (scanning), consumed
  only through a new `packages/writer-qr` facade package.

## Context

QR-paired P2P sync (Stage 2A) bootstraps trust between two devices through a
two-way QR offer/answer exchange specified in
[`packages/writer-sync/docs/pairing-protocol.md`](../../packages/writer-sync/docs/pairing-protocol.md).
The application can neither render a QR symbol nor read one from a camera, and
the repository treats both dependencies as a stop-and-ask decision requiring
bundle-size, browser-support, maintenance, licence and accessibility evidence.

## Measurements

Representative payload — Chromium data-channel-only offer, ICE gathering
complete, two host candidates, ECDSA P-256 signature and P-256 JWKs, encoded per
the protocol (canonical JSON → raw DEFLATE → base64url):

| Step | Size |
|---|---|
| SDP | 702 bytes |
| Canonical JSON payload | 1 287 bytes |
| DEFLATE (level 9, raw) | 756 bytes |
| base64url text | **1 008 chars** |

- 1 008 chars in byte mode encodes at QR **version 23** (111×111 modules) at ECC
  level `L` — one symbol, no multi-part sequence needed for the common case.
- Split into two ~512-char parts, each part encodes at version 18 at ECC `M` —
  the easier-scanning fallback the protocol's bounded multi-part sequence
  (`MAX_QR_PARTS = 8`) already covers.
- The protocol ceilings (`MAX_PAYLOAD_BYTES` 8 192, `MAX_QR_CHUNK_BYTES` 1 024)
  hold with wide margin.

Native `BarcodeDetector` remains Chromium-only; Safari and Firefox have not
shipped it and need a polyfill or file-image fallback
([caniuse](https://caniuse.com/mdn-api_barcodedetector)).

## Candidates

Filter: at least one npm publish within the six months before this decision
(≥ 2026-01-26). Sorted by weekly downloads. Sizes are minified + gzip, measured
locally from the published dist files.

| # | Package | Weekly DL | Last publish | Role | Size | Licence | Runtime deps |
|---|---|---|---|---|---|---|---|
| 1 | `react-qr-code` | ~1.87 M | 2026-06-09 | generate | ~5 KB | MIT | 2 |
| 2 | `zxing-wasm` | ~1.34 M | 2026-07-18 | scan engine | 440 KB gz WASM | MIT | 2 |
| 3 | `uqr` | ~885 K | 2026-04-03 | generate | 7.6 KB | MIT | 0 |
| 4 | `barcode-detector` | ~188 K | 2026-07-12 | scan | 17 KB JS + lazy WASM | MIT | 1 |
| 5 | `@yudiel/react-qr-scanner` | ~170 K | 2026-05-13 | scan UI | wraps #4 | MIT | 2 |
| 6 | `react-zxing` | ~8–68 K | 2026-06-01 | scan hook | wraps ZXing | MIT | 1 |
| 7 | `@zxing/browser` | unconfirmed | 2026-07-06 | scan | 5.8 MB unpacked | MIT | 0 |

Excluded by the maintenance filter: `qrcode-generator` (2025-08),
`qr-code-styling` (2025-04), `qrcode.react` (2024-12), `qrcode` (2024-08),
`html5-qrcode` (2023-04), `qr-scanner` (2022-11), `jsQR` (2021-04 — also has
documented misread behaviour, disqualifying for a security-critical scan path).

## Decision

**Generation: `uqr`.** Zero runtime dependencies — the maintenance filter holds
through the entire chain, unlike `react-qr-code`, whose actual encoder is the
unmaintained `qr.js` (~2015). Framework-neutral, 7.6 KB gzipped, returns the
module matrix directly, so rendering stays in Writer's design system with full
control of tokens, contrast themes and accessible labelling. Verified locally to
encode the real 1 008-char payload.

**Scanning: `barcode-detector`.** Implements the exact native `BarcodeDetector`
API: Chromium uses the platform detector at zero bundle cost; Safari/Firefox
lazily load the `zxing-wasm` polyfill (440 KB gz) only when the scanner opens.
The same API path handles live camera scanning and the file-image fallback for
users who decline camera permission or have no camera. Its one runtime
dependency is `zxing-wasm` itself, actively maintained (2026-07-18). Choosing
candidate #2 directly would pay the WASM on every browser including Chromium;
choosing #5 would bring third-party viewfinder UI that Writer's design-system
rules require us to build from our own primitives instead.

Both packages: MIT, no analytics, no network calls of their own (the polyfill's
WASM will be self-hosted so the strict CSP and offline use hold).

## The `packages/writer-qr` facade

Both dependencies are consumed **only** through a new workspace package,
`packages/writer-qr`, exposing two ports:

- **encode** — payload text in; QR matrix and SVG out.
- **scan** — camera stream or image file in; decoded text out, plus a
  capability probe (native vs polyfill vs unavailable) so the UI can offer the
  right fallback.

Rules, enforced by a boundary test mirroring `writer-sync`'s:

- application code never imports `uqr` or `barcode-detector` directly — swapping
  either library later touches one module;
- `writer-sync` never imports `writer-qr`: the engine stays QR-agnostic, and the
  protocol's multi-part framing/reassembly (pure string logic) lives in
  `writer-sync`, not the facade;
- `writer-qr` may use DOM APIs (camera, canvas) but never React, Dexie, Yjs,
  Lexical, `node:` builtins, `@/` imports or paths into `src/`.

## Consequences

- +2 direct dependencies; ~25 KB gzipped JS on the pairing screens only; WASM
  lazily on non-Chromium browsers only.
- The engine package's dependency count stays zero; the boundary tests keep both
  packages honest.
- The accessibility fallback chain is: live camera scan → file-image upload →
  copy/paste of the encoded payload text. The last step requires no camera and
  no image at all and is specified in the pairing protocol's carriage rules.
- If either library stalls, the facade confines the replacement cost to
  `packages/writer-qr`.
