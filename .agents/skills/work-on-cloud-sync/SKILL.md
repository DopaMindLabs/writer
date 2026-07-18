---
name: work-on-cloud-sync
description: >
  Architecture guide and guardrails for the encrypted Dexie Cloud sync layer. Use
  when touching cloud setup, encryption, key lifecycle, escrow, sync gating, or
  the cloudClient facade. Trigger terms: "cloud", "dexie cloud", "sync", "encryption",
  "escrow", "keyless", "passphrase", "cross-device", "cloudClient".
version: 1.1.0
tags: [cloud, dexie-cloud, encryption, sync]
---

# Work on Cloud Sync

## What this layer is

Encrypted cross-device document sync via [Dexie Cloud](https://dexie.org/cloud/).
All content fields are encrypted **on the client before leaving the device** — the
server stores only ciphertext.

This is **not** the same-browser multi-tab CRDT layer — that is in
`src/lib/collab/` (`work-on-editor-collaboration`).

`src/lib/sync/` is the **folder export** feature (browser File System Access API) and
is **unrelated** to Dexie Cloud.

## Activation and sticky schema

1. **Build gate** — `VITE_DEXIE_CLOUD_URL` must be a valid `https://` URL.
   See `src/lib/cloud/env.ts`. Ordinary builds omit the var entirely.
2. **Device gate** — per-browser opt-in (`?cloud-sync=on`, stored in `localStorage`
   as `lipsum-cloud-sync`). See `src/lib/cloud/flag.ts`.

`isCloudSyncEnabled()` controls feature/UI opt-in (`env && flag`). Database construction is
broader after provisioning: `buildDb` uses `env && (flag || provisioned)`.

Initial activation requires both gates. `buildDb` uses
`hasCloudEnv() && (readCloudFlag() || wasCloudProvisioned())`. Once provisioned, the
cloud schema remains active while the env URL exists even if the device flag is off;
opting out hides UI but must not downgrade or drop the schema.

## Synced vs unsynced tables

Synced and row-encrypted content: `spaces`, `sections`, `docs`, `notes`,
`noteAttachments`, `annotations`, `citations`, `connections`, `revisions`, `palettes`.
`cloudCrypto` also syncs, but it is already a passphrase-wrapped escrow envelope and is
intentionally excluded from row middleware encryption.

Local-only (never leave the device): `settings`, `backups`, `syncs`, `syncConfigs`,
`docInspectorConfigs`, `meta`, `docUpdates`.

`UNSYNCED` in `src/db/buildDb.ts` controls replication. `SYNCED_TABLES` in
`src/lib/cloud/crypto/tableRules.ts` controls row encryption. They are complementary,
not mirror lists; `cloudCrypto` is the deliberate special case.

## Key model

```
32-byte master secret (CSPRNG, never persisted in the clear)
  ├── HKDF → non-extractable AES-256-GCM content key
  ├── HKDF → public key fingerprint
  └── wrapped by AES-GCM under a passphrase-derived PBKDF2 KEK

Device key ring (content key + fingerprint)
  → saved in a separate local IndexedDB
  → used by the encryption middleware

Escrow row (cloudCrypto table, id='v1')
  = wrapped master secret + KDF metadata + fingerprint
  → syncs across devices so a second device can recover the master secret
    by supplying the correct passphrase
```

## Public `cloudClient` facade

> **Superseded for UI callers.** Components and hooks now consume sync behaviour through the
> `SyncProvider` capability adapter — `useSyncCapability('keyDelivery')` and friends, from
> `src/lib/writerSync/syncCoordinatorContext.ts` — because the facade exposes
> Dexie-Cloud-shaped types and would couple every cloud surface to one backend. The facade
> stays the only module that touches `db.cloud`, and is an implementation detail of
> `src/lib/cloud/dexieCloudProvider.ts`. Some surfaces (sync status, device registry,
> sign-in/out, mount reconciliation) still import it directly — tracked work; don't add more.

`src/lib/cloud/cloudClient.ts` is the **only** module UI components import for cloud
observables and actions. It re-exports: `SyncState`, `CloudSyncPhase`, `isCloudSyncEnabled`,
`deviceKeyProvider`, error classes, and all setup/tear-down functions. No component
imports from `dexie-cloud-addon` directly.

## Boot order (`src/App.tsx`)

```
hydrateCloudDevice   (load device key ring → register with encryption middleware)
startCloudReconciler (start polling sync state)
startEscrowReconciler(reconcile escrow on sign-in)
startKeylessLockMonitor (lock editor if signed in keyless)
```

## Key risks

| Risk | Guard |
|------|-------|
| Escrow mismatch | `src/lib/cloud/escrowReconcile.ts` — detects diverged escrow and surfaces a recovery flow |
| Keyless sign-in | `src/lib/cloud/keylessGuard.ts` — locks the editor; `KeylessSignInBlockedError` |
| Key mismatch | `src/lib/cloud/crypto/keyMismatch.ts` — emits `keyMismatchState` for the UI |
| Plain rows in cloud | `hasPlaintextSyncedRows()` in `src/lib/cloud/setup.ts` — detected before encryption is applied |

## Hard rules

- Callers import from `src/lib/cloud/cloudClient.ts` only. Never import
  `dexie-cloud-addon` directly in UI or hook code.
- For every new table, decide replication (`UNSYNCED`) and row encryption
  (`SYNCED_TABLES`) separately; test both decisions. Do not force the lists to mirror.
- `cloudCrypto` must always be a synced table. It holds the escrow; removing it from
  sync breaks cross-device key recovery.
- Never persist plaintext content to a synced table row without the encryption
  middleware applied.

## Tests

| What | Where |
|------|-------|
| cloudClient facade | `src/lib/cloud/cloudClient.test.ts` |
| cloudObservable | `src/lib/cloud/cloudObservable.test.ts` |
| escrowReconcile | `src/lib/cloud/escrowReconcile.test.ts` |
| keylessGuard | `src/lib/cloud/keylessGuard.test.ts` |
| reconcile | `src/lib/cloud/reconcile.test.ts` |
| setup (key lifecycle) | `src/lib/cloud/setup.test.ts` |
| tableRules | `src/lib/cloud/crypto/tableRules.test.ts` |
| buildDb (toggle) | `src/db/buildDb.test.ts` |

## Reference

`docs/cloud-sync-beta.md` — full design note including the key derivation model,
escrow recovery flow, and the two-gate architecture.

## Track this work as a todo list

Before you start, seed a todo list from the decisions this skill requires — for each table
or path you touch: replication (`UNSYNCED`), row encryption (`SYNCED_TABLES`), key-lifecycle
impact, and the matching test from the Tests table — one item each (see
[AGENTS.md § "Todo tracking"](../../../AGENTS.md)). Mark exactly one item in-progress as you
begin it and completed the moment it is verified done, and append any key-risk guard you must
still verify as a new item. Keep the list current: it is the source of truth for what remains
and the backbone of any [handover](../handover-writer-work/SKILL.md).
