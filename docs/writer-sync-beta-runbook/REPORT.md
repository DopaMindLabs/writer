# Pre-beta review — `fix/writer-sync-fixes` → `develop`

**Scope:** whole codebase (not just the diff), OWASP Top 10, repo-standards (AGENTS.md / CODING_STANDARDS.md). The diff is 587 files, +46,703 / −2,207 — the sync feature (engine extraction #200, QR pairing #202) plus ~24 hardening commits. 11 review dimensions, each finding checked by an independent refute-by-default verifier. Findings are split into **Part A (this branch)** and **Part B (pre-existing)**; because there is no separate review on `develop`, pre-existing findings ship in the beta and are reported too.

---

## ✅ Crypto-pairing re-verified on Opus 5 (2026-08-08)

The Fable 5 safeguard had flagged the **"Verify crypto-pairing findings"** turn and routed it to **Opus 4.8**, so those verdicts were parked as provisional. Re-verified against source on `claude-opus-5`; the marks are cleared and the verdicts below are the model of record.

- **Upheld, unchanged severity:** receive-side handover expiry (`rootSecretHandover.ts:116`, MED — and the 10 s deadline does not bound it, because the answering device waits on the peer to open the channel); `deriveKeyRing` ignores its epoch (`keys.ts:104`, LOW); rescopeFrames gap #210 (`rescopeFrames.ts:50`, LOW, tests-only caller); vacuous scope binding (`catchUpExchange.ts:276`, LOW); non-injective `:`-joined AAD (`envelope.ts:78` + operation/attachment crypto, LOW).
- **Refutation upheld:** reconnection adopt fast-path — unreachable, since the only production caller always passes `secretHandover`. Seam note, not a finding.
- **Refutation overturned → LOW confirmed:** frame-ingestion re-verify cost (`frameIngestion.ts:48`). "Bounded by 30-day compaction" fails against the finding's own threat model: the retention cutoff reads `frame.logicalAt.millis`, which the hostile provider writing the junk frames sets.

Full reasoning: `findings-log.md` §crypto-pairing re-verified.

---

## Gates
| Gate | Result |
|---|---|
| `npm run lint` | **PASS** (0 errors) |
| `npm run typecheck` | **PASS** |
| `npm run test:run` (`--maxWorkers=2`) | **PASS** (incl. package-boundary + consumer-fixture gates) |
| `npm audit` | **7 vulns (5 high):** `fast-uri` (host confusion ×2), `js-yaml` 4.0.0–4.2.0 (quadratic DoS), `react-router` 7.12.0–8.2.0 (RSC CSRF; fix is a breaking downgrade). All transitive. |
| Targeted e2e | **NOT RUN** — held during the review. Outstanding before merge. |

---

## Beta-readiness verdict

**Not ready to merge.** Five confirmed blockers plus one user-reproduced runtime blocker, most sitting on the beta's core promises (device removal, cloud multi-device convergence, no-data-loss, pairing-by-scan). Three also make the shipped help copy false.

**Minimum before merge:** fix the six blockers; keep the sharing / `AccessControlAdapter` surface dormant (it strands or leaks); correct the "no data sync" and device-removal copy; triage the 5 high `npm audit` vulns; and **run the e2e suite**. The 10 diff-highs should be scheduled before beta opens; most pre-existing items can be tracked. That the engine sits outside every coverage gate is why several of these — including the image-sync bug — reached a human tester instead of CI.

---

## 🔴 Blockers

### This branch (diff)

1. **Removing a trusted device does not stop it syncing.** `removeTrustedDevice.ts:39-67` marks the device revoked but never closes its live peer session, and `peerChannelFactory.ts:28` applies no trust filter. A device removed while online keeps receiving your new frames and serving catch-up **until the page reloads**. Help copy (`pairing-devices.md:137`) says removal takes effect. *(The per-session frame-verifier key cache, `trustedFrameVerifier.ts:40`, independently ignores mid-session revocation — fix both.)*

2. **Acknowledgements can make a peer delete data no device holds.** `catchUpExchange.ts` `admit()` swallows per-frame failures (incl. `journal.append` quota rejections) yet acks the newest admitted frame; the peer's boot-time `compactJournal` drops everything ≤ that mark. A frame that failed to persist locally is dropped from the only journal holding it, the origin vanishes from manifests, and it is never re-requested — **silent, permanent divergence** inside the retention window.

3. **The passphrase-unlock second device delivers no content.** `applyInboundFrame` (`writerOperationMaterializer.ts:139`) rejects any frame whose author is not in `trustedDevices`, and trust is written **only** by QR/WebRTC pairing (`commitTrust`). Two devices on one cloud account that unlocked with the passphrase have no trust record for each other → every replicated frame rejected on every sweep → nothing materialises. `develop` synced content directly with no trust gate, so this branch **regressed the beta's headline flow** (`cloud-sync.md:35-47`).

4. **Live attachment transfer drops its own pacing and kills the link.** `webRtcSyncProvider.ts:91-101` wraps the transport but omits `sendWhenReady`, so `livePeerSync` falls back to unpaced `send`; a normal attachment >~7 MiB overflows the bounded outbox → `TransportBackpressureError` → `failAndClose`. Defeats commit `084e3c3b`'s own fix (pacing survives only on the pairing catch-up path).

5. **QR scan is broken in production on Firefox and Safari (incl. iOS).** Prod CSP is `script-src 'self'` (`vercel.json:10`) with no `wasm-unsafe-eval`; the scanner's WASM ponyfill (used wherever native `BarcodeDetector` is absent — FF/Safari) hits a `CompileError`, so camera and image/paste scanning fail. Only typed-code pairing works on those browsers. The QR feature and the `camera=(self)` header both landed in `3a5e8f25`; the CSP was not updated. Invisible to CI (prod-only header; Playwright is Chromium/native path).

### Runtime repro (user-tested — MUST FIX)

6. **A live-added image's content does not sync to the peer (directional).** Reproduced by a human tester on **pure P2P (no server)**: images added on desktop **A never reach mobile B**; **all** B→A images arrive, including later ones. Text, spaces, and the note row sync **both ways** — only the image **attachment bytes** fail A→B. Confirmed core-feature data-non-sync — **must fix before beta**.

   **Isolation (from the repro):** frames/`send`/registry all work (text crosses A→B), so the fault is confined to the attachment **offer→request→serve round-trip on A's side**. Rules out: registry-hang (frames cross); the offer-cursor bug below (needs a 2nd image); blocker #4 alone (its overflow `failAndClose`s the channel, which would stop text too — text keeps working).

   **Leading hypothesis — A cannot build its offer (silent).** `offerAttachment` (`livePeerSync.ts:150`) calls `manifestsForScopes([scope])`, which rebuilds a manifest for **every attachment in the whole scope** and runs a strict contiguity invariant: `contentOf` throws `'attachment chunks are not contiguous'` (`attachmentChunkStore.ts:41`) if *any* attachment in that scope has a gap, a partial/in-progress chunk set, or a `noteAttachments` row with no chunk rows. One poisoning attachment makes `manifestsForScopes` throw → `offerAttachment` throws → caught and swallowed at `livePeerSync.ts:225` ("sending a frame to a peer failed"). The note frame already crossed; the `attachment-offer` never goes out. Directional because the device holding the scope-poisoning attachment (desktop A — more/older/received images) can offer nothing, while B's clean store offers fine.

   **Alternatives to rule out:** (a) blocker #4 unpaced-serve overflow for a large image if it turns out to fail on a separate channel from frames; (b) `offerAttachment`'s empty-offer guard (`if (selected.length > 0)`) hiding a genuinely missing chunk set.

   **Confirm on the live repro:** (1) inspect A's `syncAttachmentChunks` for any attachment whose indices are not `0..n-1` contiguous, or a `noteAttachments` row with zero chunk rows; (2) temporary log in `offerAttachment`/`manifestsForScopes` on A — it throws before any `attachment-offer` is sent. **Add a live-link "add image A→B, assert it appears on B" e2e** — it goes red now and, with a poisoned second attachment in scope, pins this mechanism. Independent of the fix, `manifestsForScopes` should not rebuild+validate the entire scope to offer one attachment, and `offerAttachment`'s throw must not be swallowed.

### Separate defect — 2nd-onward live image (offer-cursor reset)

Distinct from #6 and also must-fix: `attachmentTransfer.ts` `offer()` always restarts at `offerPage(context, 0)`, while the receiver's `expectedOfferCursor` only advances (`:244`). The **second** offer in a direction on one persistent link hits `message.cursor !== expectedOfferCursor` → `AttachmentCursorError` (`:237`), which the live link **swallows** (`livePeerSync.ts:142`, log-only) → that image silently never transfers. First image works; later ones fail. Covered by the same two-image e2e.

---

## 🟠 High

### This branch (diff)
- **Compaction and catch-up permanently undo each other** (`scopeManifest.ts:105`): after compaction an origin drops out of manifests → next session requests `after: undefined` → `fullState` re-authors the whole scope as fresh frames → re-journal/re-ack/re-compact every boot. Never settles.
- **Large catch-up reply fails forever** (`catchUpExchange.ts` `sendReplies`): synchronous loop into the bounded outbox; the `fullState` reply is re-minted each attempt so it never shrinks → pairing against a large scope fails on every reconnect.
- **Frame-verifier key cache skips the trust re-check** (`trustedFrameVerifier.ts:40`): trust consulted once per verifier; one verifier per session → after a peer's first frame, revoking it stops nothing on that connection. *(Provisional — under the parked crypto-pairing re-verify.)*
- **Legacy cloud reconciler races frame ingestion** (`frameIngestion.ts` / `reconcile.ts:199`): both fire on the same `syncComplete`, no shared lock; a concurrent sweep can make `reconcileDoc` restore a **stale** body, which autosaves outbound with a newer HLC — rolling content back account-wide.
- **Outbox can reorder frames** (`webRtcTransport.ts` `send`): doesn't check `pending.size`; in the [512 KiB, 1 MiB) drain window a direct send overtakes queued frames on an order-dependent reliable channel.
- **Unbounded peer-opened channels** (`peerSession.ts` `adopt`): each spawns a full catch-up session with its own rate budget → an already-paired but compromised device multiplies memory/CPU and inbound allowance N-fold.
- **`useAppBoot` double-starts the sync stack** (`useAppBoot.ts:30-43`): `stopSession` assigned only after the await → StrictMode dev deterministically orphans the first session (two `creating` hooks, every local frame sent twice); prod leaks a session on any unmount-during-boot.
- **Unbounded pending-send backlog on the common config** (`livePeerSync.ts:181`): with keys but no P2P peer, `registry.next()` never resolves, so every save's `send` suspends retaining its ciphertext frame — heap grows with every write for a solo cloud user.
- **The engine is outside every coverage gate**: `playwright.config.ts` excludes `packages/writer-sync/` from e2e coverage while vitest `coverage.include` stays `src/**` — ~17k lines of the most security-critical code measured by neither, taken without the stop-and-ask AGENTS.md requires. This is why blocker #6 reached a human, not CI.
- **AGENTS.md boundary rule contradicts the branch's own architecture** (`AGENTS.md:165`): the allow-list names only `core`/`crypto`/`operations`, but the branch exports and consumes `writer-sync/pairing`, `writer-sync/providers/webrtc` (15+ imports) and the new `writer-qr` package.

### Pre-existing
- **Cloud device "removal" revokes nothing** (`cloudClient.ts:237`): stamps `revokedAt`, shows a banner, but never forgets the key / signs out / stops syncing, and re-registers into a free slot after the tombstone goes stale. Device limit (4) enforced only by cooperative clients. Copy (`screens.json:856`, `cloud-sync.md:80-83`) claims otherwise. **OWASP A01.**
- **Stale "there is no data sync" on the eve of the sync beta** — `README.md:13`, `technical-specification.md:21` (contradicts its own §4.9), and the About + Home screen copy (`screens.json:40`,`:25`).
- **Help palette shows Mac-only ⌘ glyphs to every platform** (`HelpPalette.tsx:18`) — the `Kbd` primitive exists to derive the label; AGENTS.md makes platform-derived hints a hard rule.

---

## 🟡 Medium (condensed)

**Diff:** future-dated frames journalled before the clock check (`catchUpExchange.ts` `admit()`); root-secret handover expiry one-sided; sender ignores the message bounds its own decoder enforces (>256 spaces kills every session); `eraseSyncedContent` emits nothing after cutover (`setup.ts:344`); `AccessControlAdapter` declared but never stamps `realmId` — members would never receive frames (`dexieCloudProvider.ts:127`, dormant); ingestion re-scans the full journal every sweep (`frameIngestion.ts:51`); live link throws malformed messages out of the event listener and swallows session-fatal cursor errors (`livePeerSync.ts:140`); inbound rate limiter kills honest fast-LAN transfers (`inboundLimiter.ts`); attachment offer re-hashes every attachment in the scope to send one (`livePeerSync.ts:150`); six new components missing their `.test`/`.stories`; new module-level mutable state (`peerLinkStatus.ts:44`, `peerSessionRegistry.ts:118`); a11y announcement cluster (conditionally-mounted `role="status"` for pairing progress / camera-denied / peer-drop; `aria-label` on a `<p>`; unnamed Remove buttons); DS misuse (raw native file input; sentences in `StatusGlyph` mono voice).

**Pre-existing:** archive restore doesn't parse-check doc bodies before the destructive write (`restoreSpaceArchive.ts:89`, **A08**); capability layer has no neutral error vocabulary so UI catches Dexie error classes; space-name leak to the server on share (`spaceRealm.ts:129`, dormant).

---

## ⚪ Low (condensed)

`localeCompare` tie-break non-deterministic (`convergence.ts:16`); vacuous scope binding; rescopeFrames #210 — must stay a blocker for any scope-transition feature; AAD `:`-join; dead exports (`WriterSyncOptions`, `createReconnectPolicy` — the anti-lockstep defence is wired nowhere); barrel doesn't export `StalledAttachmentTransferError`; camera stream + interval leak on double `start()` (`useCameraScan.ts`); QR collector blames the wrong symbol; `openChannel` skips `requireOpen`; QR scanner retries a permanent WASM failure every 300 ms; QR capacity guard counts UTF-16 vs a byte cap; `useTrustedDevices` unhandled rejection → list stuck loading; growing `exchanges`/`transfers` sets; `flush()` can silently drop a frame on `send` throw; archive attachments bypass upload constraints + no zip-bomb cap (**A08**); unvalidated BroadcastChannel + persisted `theme` inputs (**A08**); test-file naming mismatches; stale "slice 1E" comment (`writerTablePolicy.ts:77`); `cloudFlagFromEnv` no prod guard; `wrapRootSecret` hardcodes `epoch:1`; `InlineBanner` dismiss label hard-coded English; hard-coded hex swatches in placeholder tabs; **12 `page.waitForTimeout`** across 9 e2e specs and one `force:true` (both violate absolute test guardrails); `ban-ts-comment` permits `@ts-expect-error` against CODING_STANDARDS §8.

---

## Inconsistencies (docs / config / spec)

**Diff:** `cloud-sync-beta.md` (mandatory pre-reading) cites six paths under the deleted `src/lib/writerSync/` tree; spec places journal retention under "Settings → Account" (renamed to Profile; control is in Device sync); spec header counts "95 e2e / 446 unit" vs reality 104 / 488; §7 matrix still lists "16 specs"; `whats-new.md`/`features.md` never mention pairing; the P2P runbook ships as "implementation plan" for shipped work and instructs creating forbidden dirs; Home copy says "Local Sync" for the tab the branch renamed "Folder sync". **Pre-existing:** `home-and-about.md` claims GNU AGPL while LICENSE is PolyForm Noncommercial; `cloud-sync-beta.md` says cloud sync "deliberately has no Help Center article" while the article exists and is registered; About-page copy typos ("advertsing", "alot ideas"); dead `windowTitle` "lotem · settings" across all locales. **Disconfirmed seed:** `vercel.json` `camera=(self)` *is* documented (spec:627-628).

---

## British-English identifiers (added review criterion — overrides the AGENTS.md identifier carve-out)

- **Diff:** the whole new `materialization/` folder (31 files) → `materialisation/`; `materializer.types.ts` (`OperationMaterializer`, `MaterializeResult`); `materializeAttachmentFrame`; `serialize`/`deserialize` in the touched `cloud/crypto/envelope.ts`.
- **Pre-existing:** `serialize.ts` (`serializeState`, `isSerialized`); `serializeCitationsToBibtex`; `serializeDocSnapshot`; `serializeNoteAttachment`; `HighlightColor`; `hasActiveBehavior`; persisted `Annotation.color`.
- **Exempt (platform APIs, keep as-is):** `ScrollBehavior`, `style.color`, `prefers-color-scheme`, Tailwind `text-center`.
- **Decision needed:** help slugs `customization-and-settings`, `organizing-your-work` (~40 locale files) — the rename directive vs AGENTS.md's "never rename slugs" (a slug rename touches URLs + the help registry).

---

## Method & limits

- Every finding tagged `diff` (introduced/touched by this branch vs `develop`) or `pre-existing`; verified by an independent refute-by-default pass; severities are the verifier-calibrated values.
- **Blind spot demonstrated by blocker #6:** static review is strong at "is this function wrong" and weak at stateful, multi-step, cross-device interactions where two locally-correct calls corrupt shared state on a later round-trip. That class needs runtime/e2e — the gate still outstanding. Adding the two-image live-sync e2e (and closing the engine coverage exclusion) would catch this class going forward.
- Full per-finding log with line refs and the refuted set: `findings-log.md`. Raw pre-verification finder output: `raw/`.
