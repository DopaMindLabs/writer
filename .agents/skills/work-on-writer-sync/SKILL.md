---
name: work-on-writer-sync
description: >
  Architecture guide and guardrails for Writer Sync: the provider-neutral sync
  engine, Writer integration, peer pairing, cryptography, replication providers
  and Dexie Cloud adapter. Use for cross-device sync, operation frames, provider
  contracts, P2P/WebRTC, encryption, escrow or reconciliation. Trigger terms:
  "writer sync", "writer-sync", "sync engine", "cross-device", "pairing", "P2P",
  "provider", "operation frame", "dexie cloud", "escrow", "cloudClient".
metadata:
  version: "2.0.0"
  tags: "writer-sync,sync,providers,p2p,dexie-cloud,encryption"
---

# Work on Writer Sync

## Start with the boundary

Writer Sync is cross-device replication with provider-neutral core behaviour and
provider-specific transport or durability. Identify the layer before editing it:

| Layer | Owns | Location |
|---|---|---|
| Engine | provider contracts, operation frames, convergence, pairing and crypto | `packages/writer-sync/` |
| Writer integration | table policy, materialisation, boot/config and React context | `src/lib/writerSyncIntegration/` |
| Peer provider | WebRTC transport, realtime/discovery | `packages/writer-sync/src/providers/webrtc/` |
| Cloud provider | durable Dexie Cloud transport, account/escrow integration | `src/lib/cloud/` |

The engine is intentionally independent of Writer. It must not import app code,
React, Dexie, Yjs or Lexical. Writer-specific tables and UI belong in the integration
layer; provider details stay behind provider contracts.

If `packages/writer-sync/` is absent on the current branch, do not invent the package
as part of unrelated cloud work. Work within the existing provider boundary unless the
task explicitly introduces or ports the engine.

Same-browser editor CRDT behaviour is handled by `work-on-editor-collaboration`.
Folder export under `src/lib/sync/` is a separate feature.

## Public capability model

UI and hooks consume sync behaviour through the `SyncProvider` capability adapter
(`useSyncCapability(...)` from the Writer Sync integration) rather than depending on
Dexie Cloud-shaped types. Capabilities include durable sync, realtime, discovery,
access control and key delivery; a provider advertises only what it genuinely supports.

Do not fabricate a provider-neutral contract merely to hide an existing provider call.
If a surface needs a capability that does not exist — for example account/session or
device-registry behaviour — treat that as a design decision and raise it explicitly.
Do not make an account, hosted server or a particular transport an implicit requirement
of the provider contract.

## Adding or changing a provider

Provider work starts from capabilities, not a vendor:

1. Declare only the capabilities the provider can actually guarantee; omit unsupported
   capabilities rather than supplying no-op or misleading implementations.
2. Keep transport, authentication/account and provider configuration behind the provider
   adapter. The engine consumes the common contract and encrypted operation/frame model.
3. Preserve the engine's delivery, validation, ordering, replay, size and error obligations.
   A provider may transport frames differently but must not reinterpret them.
4. Expose behaviour to Writer through capability selection. Do not add UI checks such as
   `provider === 'dexie-cloud'` when the decision is really `durableSync` or `discovery`.
5. Document the provider's trust boundaries and metadata exposure. Extend the feature threat
   model when the provider introduces a new party, network path, credential or authority.
6. Add contract tests shared with other providers plus focused integration tests for the
   provider-specific transport/configuration. A provider is not complete when only its happy
   path passes.

## Engine rules

- Treat `packages/writer-sync/docs/` as normative for the protocol when present.
  Read `threat-model.md` before pairing/security work, `pairing-protocol.md` and its
  test vectors before changing the QR exchange, and `sync-frame-protocol.md` before
  changing a frame or provider obligation.
- A provider carries validated encrypted frames; it does not reinterpret payloads or
  decide convergence from arrival order.
- Validate inbound data before decryption/materialisation. Preserve scope/AAD binding,
  signature verification, replay/deduplication and bounded resource limits.
- Security work must also apply the OWASP baseline from `audit-writer-change`; the
  Writer Sync threat model is more specific and takes precedence where it adds controls.
- Keep the package boundary executable. If `packageBoundary.test.ts` or the consumer
  fixture rejects a dependency, fix the boundary rather than relaxing the test.

## Writer table policy

For every table or field change, decide independently:

1. whether the data replicates;
2. which provider(s) may carry it;
3. whether content is encrypted before it crosses a provider boundary;
4. how a peer validates and materialises it;
5. which tests prove those decisions.

On branches with `writerTablePolicy.ts`, make the classification there and let derived
provider lists follow it. On earlier branches, the equivalent Dexie Cloud decisions are
`UNSYNCED` in `src/db/buildDb.ts` and `SYNCED_TABLES` in
`src/lib/cloud/crypto/tableRules.ts`; they are complementary, not mirror lists.

`cloudCrypto` is a special synced escrow envelope. It is already wrapped and must not be
treated as ordinary plaintext content.

## Dexie Cloud provider

Dexie Cloud is one durable provider for encrypted cross-device data. Content is encrypted
on the client before it leaves the device.

### Activation and sticky schema

- Build gate: `VITE_DEXIE_CLOUD_URL` is a valid `https://` URL.
- Device gate: the per-browser cloud-sync opt-in enables initial activation.
- After provisioning, preserve the cloud schema while the environment is configured even
  when the UI opt-in is off; hiding a capability must not downgrade the database schema.

### Key lifecycle

The device holds the content key locally. A passphrase-derived key wraps the root/master
secret for the `cloudCrypto` escrow record so another authorised device can recover the
content key. Never persist the master/root secret in plaintext or bypass the established
crypto middleware/vault.

### Provider-specific risks

| Risk | Guard |
|---|---|
| Escrow mismatch | `src/lib/cloud/escrowReconcile.ts` |
| Keyless sign-in | `src/lib/cloud/keylessGuard.ts` |
| Key mismatch | `src/lib/cloud/crypto/keyMismatch.ts` |
| Plain synced rows | pre-encryption/plaintext detection in cloud setup |
| Sync feedback loop | never write a synced row merely because a sync/read settled |

Keep direct `dexie-cloud-addon` use inside the cloud adapter/facade. Do not add a new UI
or hook dependency on provider internals.

## Debugging route

Use `debug-writer-sync` when the task is a failure investigation. It separates engine,
peer and live Dexie Cloud diagnostics and retains the real multi-device cloud harness
procedure.

## Verification

Run the smallest affected tests first, then the gates required by `test-writer-changes`.
For engine changes, include package-boundary/consumer tests plus the focused protocol or
crypto tests. For provider work, test the capability contract as well as provider-specific
behaviour. Security-sensitive changes need negative/adversarial cases derived from the
threat model.

## Track this work as a todo list

Before starting, seed the todo list with the boundary being changed, the replication,
provider and encryption decisions for affected data, the applicable threat-model controls,
and one item per verification above (see
[AGENTS.md § "Todo tracking"](../../../AGENTS.md)). Keep exactly one item in progress and
record newly discovered boundary work before proceeding. Use
[`handover-writer-work`](../handover-writer-work/SKILL.md) when work is paused or transferred.
