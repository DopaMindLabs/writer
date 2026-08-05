---
name: debug-writer-sync
description: >
  Diagnose Writer Sync failures across the engine, peer/WebRTC provider and live
  Dexie Cloud provider. Use when cross-device sync hangs, loops, loses data, fails
  pairing, rejects frames, stalls attachments or blocks a device. Trigger terms:
  "sync hangs", "sync loop", "won't sync", "pairing failed", "P2P", "frame rejected",
  "device limit", "cloud harness", "reproduce sync bug".
metadata:
  version: "2.0.0"
  tags: "writer-sync,sync,debugging,p2p,dexie-cloud,playwright"
---

# Debug Writer Sync

## Classify before reproducing

Start with `work-on-writer-sync`, then identify the failing boundary:

| Symptom | Start here |
|---|---|
| Pairing, verification code, reconnect or peer discovery | Writer Sync pairing/WebRTC tests and normative protocol docs |
| Frame rejection, non-convergence, replay or attachment stall | engine `core` / `operations` / `crypto` tests and frame protocol |
| Writer row missing after a valid frame | `src/lib/writerSyncIntegration/` materialisation/table policy |
| Cloud loop, key/escrow/account/device problem | Dexie Cloud provider and live cloud harness below |

Trace the failure from the first violated invariant. Do not switch providers merely to
make the symptom disappear.

For any other provider, begin with the same engine/provider contract and shared capability
tests, then load that provider's own transport/configuration diagnostics. Do not assume a
provider has an account, server, durable store or discovery channel unless its declared
capabilities say so.

## Engine and peer diagnostics

- Reproduce with the narrowest package/integration test before using a full browser flow.
- For pairing or frame failures, read the corresponding normative document and threat model
  before changing protocol code. A security invariant is not a retry condition.
- Keep provider input hostile: malformed, replayed, reordered, duplicated or oversized
  input must fail through the documented typed path without partial materialisation.
- For convergence, compare operation identity/logical ordering and accepted journal state;
  transport arrival order is not the source of truth.
- For attachment stalls, inspect offer/cursor/backpressure state and verified chunk
  persistence before changing retry limits.

When the feature branch supplies a real two-device/P2P runbook, use it for the final
reproduction after focused tests. Do not claim a real-device pairing path is verified by
a mocked WebRTC test.

## Live Dexie Cloud harness

`scripts/cloud-device-harness.mjs` drives separate Chromium profiles against a real Dexie
Cloud account and reports what crossed the wire. Use it only for failures that depend on a
live cloud provider; ordinary CI uses a non-live endpoint and cannot prove server settling.

Start the dev server, then run:

```bash
npm run cloud:harness -- --devices 3
```

For a non-interactive agent run, pass the supported account flags. When the harness prints
the file path for a one-time code, ask the user for that code; do not access their inbox.

`--purge` removes synced rows and the device registry from the live account. It is
destructive and irreversible: get explicit user confirmation immediately before using it.

## Known cloud signatures

| Signature | Likely boundary to inspect |
|---|---|
| Hundreds of `/sync` calls and a flashing/hung UI | a synced-table write is retriggering the sync that caused it |
| Repeated blob download/save errors | ciphertext was offloaded and re-entered encryption middleware; verify inline envelope handling |
| New device stuck fetching/unlocking | device-registry capacity/stale-device handling |
| Rows disappear with an unexpected key-mismatch state | decrypt/open error classification before assuming tamper/key mismatch |

Never prove the absence of a sync write by comparing stored values: a byte-identical `put`
can still enqueue a mutation. Spy on the write path or provider operation and assert it was
not called.

## Evidence to report

Report the provider/boundary, the smallest reproduction, expected invariant, first observed
violation, relevant frame/provider state, and the focused test that demonstrates the cause.
Do not log plaintext content, secrets, escrow material, OTPs or raw key bytes.

## Track this work as a todo list

Seed the todo list with classification, focused reproduction, invariant trace, root cause,
regression test and final provider-level verification (see
[AGENTS.md § "Todo tracking"](../../../AGENTS.md)). Add live-account or destructive steps
only when actually required; their approval remains a separate open item until granted.
