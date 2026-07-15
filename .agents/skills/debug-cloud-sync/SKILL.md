---
name: debug-cloud-sync
description: >
  Reproduce and diagnose cross-device cloud-sync failures against a real Dexie Cloud
  account, using the multi-device Playwright harness. Use when sync hangs, flashes,
  loops, loses rows, or blocks a device — anything that only misbehaves against a live
  server. Trigger terms: "sync hangs", "sync loop", "flashing", "downloading forever",
  "device limit", "won't sync", "cross-device", "reproduce sync bug", "cloud harness".
version: 1.0.0
tags: [cloud, dexie-cloud, sync, debugging, playwright]
---

# Debug Cloud Sync

## What this harness is

`scripts/cloud-device-harness.mjs` drives **N real Chromium profiles** — each a distinct
device with its own IndexedDB and localStorage — against a **real** Dexie Cloud account,
and reports what actually crossed the wire per device.

It exists because the failures that matter here are invisible everywhere else. The e2e
build points at `cloud.example.invalid`, where no sync round ever settles, so the sync
engine's write path never runs in CI. Unit tests fake the addon. Only a live server
reproduces the class of bug that has actually bitten this project twice: **a write on a
synced table that re-triggers the sync that caused it**.

## Running it

The harness needs a real account, so it is not in CI. Start the dev server first.

```bash
npm run dev                                   # separate terminal
npm run cloud:harness -- --devices 3          # prompts for email, passphrase, OTPs
npm run cloud:harness -- --purge              # wipe the account's rows and push
```

It prompts for the number of devices, then for each device's one-time code as the email
arrives. It signs each device in, unlocks it, idles 60 seconds, then prints per-device
traffic and the account contents.

**Running it as an agent (no TTY).** Pass `--devices`, `--email` and `--passphrase` as
flags, and run it in the background. When it needs a code it prints:

```
  [A] no terminal — write the code to: .cloud-harness/otp-A.txt
```

**Ask the user for the code** — you cannot read their inbox — then write it to that path
and the run continues. One code per device, in turn.

`--purge` deletes every synced row plus the device registry through Dexie and pushes. Use
it to reset a polluted beta account. It is destructive and irreversible: **confirm with the
user first**.

## Reading the output

```
  A: 3 sync, 0 blob, 87 console lines — ok
  B: 1064 sync, 0 blob, 15215 console lines — LOOP
```

`sync` is the count of `POST /sync`. A device that is merely syncing settles in a handful
of rounds. The harness exits non-zero above 25.

## Known failure signatures

| Signature | Cause |
|---|---|
| Hundreds/thousands of `/sync`, console in the tens of thousands, UI flashes and hangs | A **sync loop**: something writes to a synced table on every settle. The write re-triggers the sync that triggered the write. Found once in the device registrar refreshing `lastSeenAt` unconditionally. |
| `Error saving resolved blobs … Cannot convert undefined or null to object`, one blob re-downloaded hundreds of times | Ciphertext offloaded to **blob storage**. Dexie Cloud auto-offloads any `Uint8Array` ≥ 4 KB; the blob save-back re-enters the encryption middleware and corrupts the write. Envelopes must stay inline base64 strings, with `largeStringThreshold: Infinity`. |
| A new device sits on "fetching your account…" or flashes downloading, and cannot unlock or set up | The **device registry is full**. Read `cloudDevices` — dead rows from wiped profiles used to hold slots for ever. Only live slots count now; a stale one frees itself. |
| Rows vanish from one device, key-mismatch banner appears from nowhere | A read failed to decrypt and was misclassified as tamper. Check `openRow`'s error classification before assuming a wrong key. |

## Inspecting the account by hand

`window.db` is exposed in dev. Read the registry and the raw envelopes straight from the
device — this is usually faster than any amount of reasoning:

```js
await window.db.cloudDevices.toArray()                 // slots, lastSeenAt, revokedAt
(await window.db.docs.toArray())[0].$lipsumCipher      // iv/data must be strings
```

## Hard rules

- **Never assert an absent write by comparing stored values.** A `put` of a byte-identical
  row still enqueues a mutation on a synced table. A value comparison passes happily while
  the loop runs. Spy on the write and assert it was not called.
- **Never write to a synced table from a render, a live query, or a "touch on view".** That
  is the loop, rebuilt.
- **Ask before purging.** `--purge` is irreversible and hits the shared account.
- **Ask the user for each OTP.** Do not attempt to read their mail.
- Headless always (the harness is headless by default) — never `--headed`, per
  [`test-writer-changes`](../test-writer-changes/SKILL.md).

## Reference

- [`docs/cloud-sync-beta.md`](../../../docs/cloud-sync-beta.md) §6.5 — the device registry,
  the refresh interval, and why it is load-bearing.
- [`work-on-cloud-sync`](../work-on-cloud-sync/SKILL.md) — the architecture this debugs.
