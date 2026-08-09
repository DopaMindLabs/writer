# Writer Sync coverage matrix

This matrix separates browser evidence from protocol and engine evidence. A Playwright test should prove the assembled application works through the browser. It should not duplicate every pure state transition, crypto primitive or frame-validation branch already better exercised by Vitest.

## Test-layer contract

| Layer | What it proves | Typical location |
|---|---|---|
| Unit | Pure mapping, state machine, validation, limits, error classification. | `packages/writer-sync/src/**/*.test.ts`, adjacent app tests |
| Contract/integration | Provider capability parity, journal/materialiser behaviour, real IndexedDB timing, package-to-app boundary. | package tests, `src/lib/writerSyncIntegration/**/*.test.ts`, selected browser-backed integration specs |
| Functional E2E | A user can complete the assembled browser journey and observe the promised outcome. | `e2e/*.spec.ts` |
| Preview E2E | A deployed artefact works with production routing, headers and CSP. | `preview-smoke.spec.ts` and focused preview-only specs |
| Physical-device check | Camera/network/platform behaviour that two contexts on one runner cannot prove. | release checklist; automate later when infrastructure exists |

Keep no more real WebRTC pairings than the user-visible claims require. Use the existing E2E seam for UI-only link-state rendering and package tests for protocol permutations.

## Existing browser journeys

### Pairing and P2P

| Spec | Existing claim | Proposed tags | Keep real WebRTC? | Priority |
|---|---|---|---|---|
| `pair-device.spec.ts` | QR/paste exchange, verification, multipart symbols, unrelated session refusal, uploaded image, camera controls, entry points and device list. | `@sync @p2p`; primary exchange also `@smoke`; malformed/session cases `@security` | Yes for one complete exchange, multipart and uploaded-image decoder. UI-only entry-point assertions may use a seam. | P0/P1 |
| `pair-sync.spec.ts` | Existing writing catches up; writing created after pairing transfers. | `@sync @p2p @smoke` | Yes. This is the smallest proof that pairing is useful. | P0 |
| `pair-sync-content.spec.ts` | Note/body and open-editor content transfer live. | `@sync @p2p` | Yes. | P0 |
| `pair-sync-reconcile.spec.ts` | Two-way space creation, deletion, acknowledgement and compaction. | `@sync @p2p @recovery` | Yes for bidirectional and delete convergence; keep compaction internals at integration level where possible. | P0/P1 |
| `pair-again.spec.ts` | Removed device re-pairs and sync resumes. | `@sync @p2p @recovery @smoke` | Yes; regression for the revoked-record trap. | P0 |
| `pair-remove-disconnects.spec.ts` | Removal disconnects a live peer and blocks later writing. | `@sync @p2p @security @smoke` | Yes; authority revocation must be observed across the live boundary. | P0 |
| `pair-expiry.spec.ts` | Late confirmation transfers nothing and persists no trust, including re-pair. | `@sync @p2p @security` | Yes for the assembled expiry journey; edge permutations stay in package tests. | P0 |
| `pair-device-drop.spec.ts` | Closing either context reaches the other device as a link drop. | `@sync @p2p @recovery` | Yes. | P1 |
| `peer-link-state.spec.ts` | Connected/dropped/idle UI, reconnect action and unobtrusive notice. | `@sync @p2p @a11y` | No. Keep the existing E2E-only `window.peerLink` seam because the claim is UI state. | P1 |
| `attachments-pair-sync.spec.ts` | An image larger than two chunks transfers and survives reload. | `@sync @p2p @attachment @smoke` | Yes. Extend to the missing same-direction and poisoned-attachment regressions. | P0 |

### Cloud, journal and recovery

| Spec | Existing claim | Proposed tags | Priority |
|---|---|---|---|
| `cloud-sync.spec.ts` | Feature gates, passphrase set-up, lock/keyless/conflict UI, device limit and encrypted read. | `@sync @cloud`; core set-up/unlock also `@smoke`; failure cases `@recovery` | P0/P1 |
| `cloud-devices.spec.ts` | Device registry/list actions, revoked messaging, stale-slot reclaim and a11y. | `@sync @cloud @recovery @a11y` | P1 |
| `cloud-recovery-code.spec.ts` | Printed recovery code restores a key; mismatched code is rejected. | `@sync @cloud @recovery @security` | P0 |
| `cloud-operation-journal.spec.ts` | Real IndexedDB journalling/materialisation and refusal of forbidden/untrusted frames. | `@sync @cloud @journal @security` | P0 |
| `cloud-crdt-recovery.spec.ts` | A document survives loss of the local CRDT log. | `@sync @cloud @recovery` | P0 |
| `multi-tab-sync.spec.ts` | Same-device CRDT/presence and compaction. | `@collab`; do not label as cross-device `@sync` unless the test exercises Writer Sync. | P1 |

## Beta blocker mapping

The blocker identifiers come from `docs/writer-sync-beta-runbook/RUNBOOK.md` on the earlier reference branch. This table records what the current `fix/writer-sync-beta-blockers` delta proves and what browser evidence remains.

| Blocker | Required invariant | Current evidence on the base | Remaining E2E work |
|---|---|---|---|
| B1 — removal does not stop live sync | A removed peer loses its live session and authority immediately. | `pair-remove-disconnects.spec.ts` was added; trust verifier/session/removal unit tests changed. | Tag as P0 and retain real two-context assertion. Add a negative assertion that no new frame/materialised row arrives after removal, not only a UI badge. |
| B2 — acknowledgement passes a persistence gap | A failed journal append is never covered by an acknowledgement or compacted at the sender. | `catchUpExchange.test.ts` and implementation changed substantially. | Keep at package/integration level. A browser cannot deterministically cause a mid-batch IndexedDB quota failure without an artificial seam and adds little evidence. |
| B3 — passphrase-only cloud devices do not converge | Two authorised cloud devices that share the account key converge without QR pairing. | No cloud cross-device convergence spec is present; existing cloud specs are single-context UI/IndexedDB tests. | Add `cloud-cross-device-sync.spec.ts` or a provider-backed integration harness that uses two isolated contexts and the same durable account. This is P0. If the local invalid Dexie URL cannot provide this, run the test only against an approved deterministic cloud harness; do not fake success with direct row copying. |
| B4 — live attachment pacing lost in wrapper | A large attachment is paced through the wrapped transport and the link remains usable. | `webRtcSyncProvider.test.ts` now asserts capability parity and paced large serve. | Extend `attachments-pair-sync.spec.ts` to transfer two images in the same direction and then transfer text, proving the link remains usable. Use a payload above the former failure threshold or an approved E2E-only budget seam. |
| B5 — WASM decoder blocked by production CSP | The ponyfill decoder loads and decodes under deployed production headers where native `BarcodeDetector` is absent. | `deploymentHeaders.test.ts` was added and `vercel.json` changed; preview smoke remains Chromium-only. | Add a focused WebKit preview journey using an uploaded QR image, or a deterministic forced-ponyfill deployment test. Header-string unit coverage alone does not prove WASM compilation and asset loading. |
| B6 — live image A→B stalls | Each offered attachment is isolated; a partial/poisoned attachment does not block later offers; cursors support repeated offers. | Existing attachment E2E proves one image larger than two chunks. No evidence covers two same-direction images or a poisoned sibling. | Extend or add `attachments-pair-sync-recovery.spec.ts`: pre-seed an incomplete sibling, transfer image 1 and image 2 A→B, assert both bytes render and survive reload, then assert text still crosses. P0. |

## Missing P0 journeys

### 1. Disconnected work catches up after a fresh session

Current live-sync specs keep both devices connected. `pair-sync-reconcile.spec.ts` explicitly records that work created while devices are apart and then brought back together is not covered.

Add `e2e/pair-reconnect-catch-up.spec.ts`:

```gherkin
Given two devices have paired and completed initial catch-up
And their peer session has been closed on both sides
When device A creates a space and edits a document while device B is offline
And the two devices establish a fresh trusted session
Then device B receives the missed space and document content
And device A retains the operation until B acknowledges persistence
```

Use the real reconnection route the product exposes. If the UI currently requires re-pairing rather than silent reconnect, drive that exact route and name the test accordingly.

### 2. Passphrase-only cloud convergence

Add the B3 journey only when there is a deterministic provider/harness capable of carrying frames between contexts. Directly inserting a frame into the receiving database proves materialisation, not cloud convergence.

```gherkin
Given device A has enabled cloud sync and published escrow
And device B signs into the same test account and unlocks with the passphrase
When device A creates and edits a document
Then device B receives and materialises the document without QR pairing
And the receiving editor opens the expected content
```

The harness must allocate a unique account/realm per worker so parallel jobs cannot share server-side state.

### 3. Repeated and poisoned attachment offers

```gherkin
Given A and B are paired
And A holds an incomplete attachment record in the same scope
When A adds two valid images one after the other
Then both valid images appear on B
And both survive B reloading
And a later text edit still crosses the same link
```

The incomplete record must be created through a typed E2E seam or a database helper with the real schema contract. Keep the seam available only in development/E2E builds.

### 4. Production decoder fallback

```gherkin
Given the deployed preview supplies production CSP headers
And the browser has no native BarcodeDetector path
When the user uploads a photograph containing a valid pairing QR symbol
Then the WASM decoder loads without a CSP violation
And the original pairing text is returned exactly
```

Use WebKit or a forced-ponyfill build. The test must fail when `wasm-unsafe-eval` is removed from the production policy.

## Security/adversarial coverage ownership

Derived from `packages/writer-sync/docs/threat-model.md`:

| Threat | Browser evidence | Package/integration evidence |
|---|---|---|
| copied/replayed/expired QR | Expired pairing leaves no trust; unrelated-session symbol refused. | replay cache, expiry/skew, session/nonce validation. |
| altered offer/answer or transcript MITM | User sees matching verification digits in a complete exchange. | signatures, transcript binding, key agreement and test vectors. |
| forged inbound operation | `cloud-operation-journal.spec.ts` refuses an untrusted author/table. | signature, AAD/scope, frame verifier and malformed payload matrices. |
| replayed operation | Observe no duplicate materialised user row in one selected journey if cheap. | operation-id dedupe and inbox/journal contract tests. |
| wrong-scope frame | No dedicated Playwright test unless a user-visible leak was previously possible. | verifier/materialiser negative tests. |
| malicious attachment count/size | One bounded failure/recovery UI journey if present. | manifest/chunk limits, cursor, pacing and rate-limit tests. |
| removed device reconnecting | `pair-remove-disconnects` and `pair-again`. | registry authority and per-frame trust checks. |
| message flood/reconnection loop | Do not simulate a flood through UI. | transport/channel limit and reconnect policy tests. |

## Local coverage ownership

The Writer Sync local E2E profile should include only browser-delivered code whose behaviour can be driven through Playwright:

- `src/lib/writerSyncIntegration/**`;
- pairing and device-sync surfaces under `src/components/pairing/**` and the relevant settings components;
- E2E-reachable `packages/writer-sync/src/**` and `packages/writer-qr/src/**` sources mapped through Vite source maps.

Do not make the local browser percentage depend on pure package modules the app never bundles for the exercised provider. Those modules still require Vitest coverage under the package gate. The implementation must report both:

1. browser-reachable Writer Sync local coverage; and
2. package unit/contract coverage.

If the browser profile cannot reach 85% on every metric, first identify files that belong at unit/contract level and improve their package gate. If genuinely browser-only paths remain unreachable, stop for the required user decision rather than lowering the floor.

## Tagging rules

- Tags are orthogonal metadata, not directory aliases.
- Every Writer Sync browser test receives `@sync` plus one provider tag: `@p2p` or `@cloud`.
- A test receives `@smoke` only when its failure alone should block beta confidence immediately.
- Use `@security`, `@recovery`, `@attachment`, `@journal`, `@a11y` for further selection and reporting.
- Do not tag same-browser `multi-tab-sync` as cross-device `@sync` merely because its name contains sync.
- Put tags in Playwright's native test details object so `--grep` and reports see them; do not encode categories in titles.

Example:

```ts
test(
  'sync survives removing a device and pairing it again',
  { tag: ['@sync', '@p2p', '@recovery', '@smoke'] },
  async ({ page, browser, browserName }) => {
    // existing journey
  },
);
```
