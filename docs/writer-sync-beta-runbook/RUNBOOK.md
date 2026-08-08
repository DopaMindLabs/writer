# Pre-beta fix runbook — `writer-sync`

Reference runbook for landing the review findings before the beta merge of `fix/writer-sync-fixes` → `develop`. Findings and evidence: [`REPORT.md`](./REPORT.md); full per-finding log with `file:line` and the refuted set: [`findings-log.md`](./findings-log.md); raw finder output: [`raw/`](./raw/).

## How to use this runbook

Each item below is one unit of work. Follow the repo **task order** (AGENTS.md) for every one:

1. **Compliance refactor first** (separate `refactor:` commit) if the file you must touch already violates the standards.
2. **Failing test first** (TDD) — write/extend the unit or e2e test that describes the intended behaviour.
3. **Implement** until green; keep `npm run lint` and `npm run typecheck` clean as you go.
4. **Same PR:** update the spec section, help article(s), a11y tests, and `.stories.tsx` the change touches.
5. **Gates:** `npm run lint`, `npm run typecheck`, `npm run test:run`; `npm run test:e2e` for UI-facing changes; `npm run test:e2e:coverage` for coverage-affecting changes.
6. **Conventional Commit**; PR title is itself a valid Conventional Commit subject; open PR as **Draft**.

Do not weaken a limit, silence a linter, or skip a test to pass — split/refactor instead, or stop and ask (AGENTS.md).

## Order of work

1. Blockers B1–B6 (ship-stoppers).
2. Opus 5 re-verify of the parked crypto-pairing findings (some fixes below depend on those verdicts being real).
3. High-severity H1–H12.
4. Supply-chain + coverage + e2e gates.
5. Medium/Low and inconsistencies (track; fix what the touched PRs cover).

---

## Blockers

### B1 — Removing a trusted device does not stop it syncing
- **Where:** `src/lib/writerSyncIntegration/removeTrustedDevice.ts:39-67`; `peerChannelFactory.ts:28`; `trustedFrameVerifier.ts:40`.
- **Symptom:** a device removed while online keeps receiving frames and serving catch-up until reload; help copy says removal takes effect.
- **Fix:** on removal, look up and close the device's registered peer session (`peerSessions.remove` + `session.close`); refuse channels for non-`Active` devices in `peerChannelFactory`; make `trustedFrameVerifier` re-check `isTrustedForSession` per frame (or invalidate the per-device key cache on registry mutation).
- **Test:** unit — removing a device closes its session and subsequent frames from it are refused. e2e — pair, remove, assert peer stops receiving.
- **Docs:** none (behaviour now matches `pairing-devices.md`).

### B2 — Ack + compaction drops frames the acking device never stored
- **Where:** `packages/writer-sync/src/operations/catchUpExchange.ts` `admit()`/`acknowledgementsFor`; `journalCompaction.ts`.
- **Symptom:** a per-frame journal failure (e.g. quota) is swallowed but the newest frame is still acked; the peer compacts frames the device never persisted → silent permanent divergence.
- **Fix:** never ack past a gap — acks must reflect actually-persisted frames; a failed `journal.append` must lower the ack watermark, not be treated like a rejected forgery.
- **Test:** unit — inject a journal-append failure mid-batch; assert the ack does not cover the failed frame and the peer does not compact it.

### B3 — Passphrase-unlock second cloud device delivers no content
- **Where:** `writerOperationMaterializer.ts:139`; `writerFrameVerifier.ts:37`; trust written only by `commitTrust` (`peerCatchUp.ts:272`).
- **Symptom:** two devices on one cloud account that unlocked via passphrase (no QR pairing) reject every replicated frame → nothing materialises. Regression vs `develop`, which synced content directly.
- **Fix (decision needed):** either give same-account cloud devices a trust path (e.g. escrow-derived device trust so cloud-delivered frames verify), **or** change the cloud-sync UX/spec/help to require pairing. Do not ship the current silent-no-op.
- **Test:** e2e/integration — two cloud devices, passphrase unlock only, assert content converges (once the path exists).
- **Docs:** `cloud-sync.md:35-47`, spec §4.9.1.

### B4 — Live attachment transfer drops pacing and kills the link
- **Where:** `packages/writer-sync/src/providers/webrtc/webRtcSyncProvider.ts:91-101` (the `tracked` wrapper omits `sendWhenReady`); `livePeerSync.ts:129`.
- **Symptom:** unpaced serve overflows the bounded outbox → `TransportBackpressureError` → `failAndClose`; a >~7 MiB attachment kills the live link.
- **Fix:** the tracked wrapper must forward `sendWhenReady` (and any other capability it proxies). Add a wrapper test asserting capability parity with the underlying transport.
- **Test:** unit — wrapper exposes `sendWhenReady`; serve of a large attachment paces instead of overflowing.

### B5 — QR scan broken in production on Firefox/Safari (incl. iOS)
- **Where:** `vercel.json:10` — prod CSP `script-src 'self'`; scanner WASM ponyfill at `defaultQrDetectorFactory.ts`.
- **Symptom:** WASM `CompileError` under CSP3 wherever native `BarcodeDetector` is absent; only typed-code pairing works.
- **Fix:** add `'wasm-unsafe-eval'` to `script-src` in `vercel.json` (keep `camera=(self)`). Verify no other directive blocks the worker/wasm asset.
- **Test:** add a prod-CSP check (the e2e already asserts CSP via `failOnCspViolation`); exercise the ponyfill path on a non-Chromium engine if the harness allows, else document the manual check.
- **Docs:** note the CSP requirement beside the `camera=(self)` note (spec:627).

### B6 — Live-added image content does not sync A→B (runtime repro; root cause unconfirmed)
- **Where:** `livePeerSync.ts:150` `offerAttachment` → `attachmentChunkStore.ts:55` `manifestsForScopes` → `contentOf` contiguity invariant (`:41`); silent swallow at `livePeerSync.ts:225`.
- **Symptom (pure P2P):** text/spaces/note row sync both ways; image **bytes** never go A→B; all B→A images arrive.
- **Confirm first (before fixing):** on device A, inspect `syncAttachmentChunks` for any attachment with non-contiguous indices or a `noteAttachments` row with zero chunk rows; and/or log inside `manifestsForScopes`/`offerAttachment` to see it throw before any `attachment-offer` is sent.
- **Fix (once confirmed):** `offerAttachment` should build a manifest for **only the attachment being offered**, not rebuild+validate the whole scope; a per-attachment failure must not block all offers; `offerAttachment`'s throw must not be silently swallowed as a generic "frame send failed".
- **Test:** e2e — add an image A→B over a live link and assert it appears on B, **with a second poisoned/partial attachment already in the scope** (reproduces the throw). This is the regression test the suite lacked.
- **Related defect (fold in):** 2nd-onward live image fails via the offer-cursor reset (`attachmentTransfer.ts` `offer()` restarts at cursor 0 while the receiver's `expectedOfferCursor` is monotonic; `AttachmentCursorError` swallowed at `livePeerSync.ts:142`). Same e2e (two images same direction) covers it.

---

## Parked — Opus 5 re-verify (do before relying on the crypto-pairing verdicts)

The crypto-pairing findings were **verified on Opus 4.8 under a safeguard flag**, not the model of record — treat as provisional. Re-run that verification on `claude-opus-5` and reconcile before actioning:
- `rootSecretHandover.ts:116` receive-side expiry not enforced
- `keys.ts:104` `deriveKeyRing` ignores epoch
- `rescopeFrames.ts:50` gap #210 (must stay a blocker for any scope-transition feature)
- `catchUpExchange.ts:276` vacuous scope binding
- AAD `:`-join non-injective (`envelope.ts:78` + operation/attachment crypto)
- Re-check the two findings that turn **refuted** (reconnection adopt fast-path; frame-ingestion re-verify cost).

---

## High (H1–H12) — schedule before beta opens

Full detail in `findings-log.md`. Summary:

| # | Item | Where |
|---|---|---|
| H1 | Compaction/catch-up undo loop → full-scope re-transfer every boot | `scopeManifest.ts:105` |
| H2 | Large catch-up reply fails forever (fullState re-mint) | `catchUpExchange.ts` `sendReplies` |
| H3 | Frame-verifier key cache skips per-frame trust re-check *(provisional)* | `trustedFrameVerifier.ts:40` |
| H4 | Legacy cloud reconciler races frame ingestion → stale-body rollback | `frameIngestion.ts` / `reconcile.ts:199` |
| H5 | Outbox reorders frames on an ordered channel | `webRtcTransport.ts` `send` |
| H6 | Unbounded peer-opened channels → paired-device DoS | `peerSession.ts` `adopt` |
| H7 | `useAppBoot` double-starts sync stack (StrictMode) / leaks on unmount-during-boot | `useAppBoot.ts:30-43` |
| H8 | Unbounded pending-send backlog on cloud-only/no-peer config | `livePeerSync.ts:181` |
| H9 | Engine outside every coverage gate | `playwright.config.ts`, `vite.config.ts` |
| H10 | AGENTS.md boundary allow-list contradicts branch exports | `AGENTS.md:165` |
| H11 | Cloud device "removal" revokes nothing *(pre-existing, A01)* | `cloudClient.ts:237` |
| H12 | "No data sync" copy on README/spec/About+Home *(pre-existing)* + Mac-only ⌘ glyphs | `README.md:13`, `screens.json`, `HelpPalette.tsx:18` |

---

## Gates & housekeeping

- **Supply chain:** triage `npm audit` — 5 high (`fast-uri`, `js-yaml`, `react-router` RSC CSRF). Apply `npm audit fix`; assess the `react-router` breaking downgrade separately.
- **e2e:** run the targeted specs (never run this review) and the full suite before merge; expect the ~20% pairing flake — retry, don't blame the diff.
- **Coverage:** remove the `packages/writer-sync/` e2e-coverage exclusion (or add a vitest coverage target for `packages/**`); the engine must sit under a gate. Update AGENTS.md §e2e to match reality.
- **British-English identifiers** (added criterion): rename `materialization/` → `materialisation/` and the `Materialize*` symbols; decide the help-slug rename (`customization-and-settings`, `organizing-your-work`) vs AGENTS.md "never rename slugs" — **needs a human decision**.

## Definition of done (beta merge)

- [ ] B1–B6 fixed with regression tests (B3 and the slug rename need a human decision recorded).
- [ ] Opus 5 re-verify of crypto-pairing complete; provisional marks cleared or findings actioned.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:run` green; targeted + full e2e green; coverage gate covers the engine.
- [ ] `npm audit` high vulns triaged.
- [ ] Sharing / `AccessControlAdapter` surface confirmed dormant for beta.
- [ ] Spec + help updated for every behaviour change; "no data sync" copy corrected.
