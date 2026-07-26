# ADR 0002 — A single declared Dexie schema version

- **Status:** accepted (user sign-off, 2026-07-26; runbook §30.8 stop-and-ask)
- **Stage:** pre-release; applied during Writer Sync Stage 2A
- **Decision:** `LoremDB` declares one Dexie `version(1)` and new tables go
  straight into `STORES`. The previous rule — a new Dexie version whenever
  `STORES` changes — is withdrawn.

## Context

Stage 1 added the operation-protocol stores behind a `version(2)`, leaving
`STORES_V1` frozen as a historical snapshot. The rule requiring that lived in
`.agents/skills/change-writer-persistence/SKILL.md` and
`.agents/skills/audit-writer-change/SKILL.md` — not in `AGENTS.md`, despite the
runbook's §30.8 entry claiming otherwise.

Writer is pre-release. No installed database holds writing anyone is unwilling to
delete and reseed, so the cost of historical versions — a frozen snapshot per
version, and a migration story for each — buys nothing.

## What Dexie actually does

The decision rested on an empirical question, so it was measured in real Chromium
rather than reasoned about. Dexie's **declared** version is not the IndexedDB
version: it maps declared `N` to raw IndexedDB version `N × 10` and manages the
raw counter itself.

| Action | Declared `verno` | Raw IndexedDB version |
|---|---|---|
| Open with `version(1)` + `version(2)` | 2 | 20 |
| Reopen declaring only `version(1)`, same tables | 1 | 20 |
| Reopen declaring only `version(1)` **plus a new table** | 1 | 21 |

So collapsing to one declared version does **not** downgrade anything and does not
fail: an existing database opens, keeps its rows, and gains new stores on next
open. Each later additive change raises the raw counter by one.

## Decision

`src/db/LoremDB.ts` declares exactly one version. New tables, new indexes and
primary-key changes are made in `STORES` (`src/db/stores.ts`) under it. The same
applies to the other device-local databases (`lipsum-cloud-keystore`,
`lipsum-device-vault`).

This is enforced, not merely documented: `src/db/db.test.ts` and
`src/db/buildDb.test.ts` assert `verno === 1`, so a new `version(n)` fails the
suite.

## Conditions

**While this holds.** Every existing `lipsum` database is disposable — nobody
holds writing in it that we are unwilling to delete and reseed. This is a
statement about *data*, not about a release date or a version number: a private
beta in which testers keep real work ends it; a public alpha of explicitly
disposable data does not.

**Additive only.** One declared version absorbs *additive* changes for free — a
new store appears on next open and existing rows are untouched. A *destructive*
change (dropping a store, changing a primary key, renaming an indexed field) still
discards data on every existing database, and this repository has **no `.upgrade()`
callback anywhere** — there is no migration machinery to carry rows across.
Destructive schema changes remain a stop-and-ask even while Writer is pre-release.

## Reinstating historical versions later

When real users hold data, historical versions come back — and the version number
chosen then matters, because the raw counter has been climbing in the meantime.

A reinstated `version(N)` runs its `upgrade()` callback **only if `N × 10` exceeds
the current raw IndexedDB version.** Measured, on a database whose raw counter had
reached 21:

| Reinstated as | Opens | Rows kept | `upgrade()` ran |
|---|---|---|---|
| `version(2)` (maps to raw 20) | yes | yes | **no — silently skipped** |
| `version(3)` (maps to raw 30) | yes | yes | yes |

The dangerous case is the quiet one: `version(2)` opens perfectly and reports
`verno === 2`, while the migration it exists to perform never runs. So the first
reinstated version must be numbered above `ceil(rawVersion / 10)` for the raw
version observed in the field — check it with `indexedDB.databases()` rather than
assuming, and cover it with a test that asserts the callback actually ran.

Reinstating historical versions is itself a stop-and-ask.

## Consequences

- `STORES_V1` is deleted; there is one schema spec, so the cloud layer's
  `tableRules` and the sync layer's `writerTablePolicy` can no longer disagree
  with the declared schema.
- Three version assertions moved from `2` to `1`
  (`src/db/db.test.ts`, `src/db/buildDb.test.ts` ×2). No test proved an upgrade
  path — none exists — so nothing was weakened to make this pass.
- Test fixtures that already declared `version(1).stores(STORES)` on throwaway
  databases (`src/lib/cloud/crypto/middleware.test.ts`,
  `src/lib/cloud/frameReplication.test.ts`) now match production instead of
  diverging from it.
- Every table in `STORES` must still be classified in
  `src/lib/writerSyncIntegration/writerTablePolicy.ts`; an unclassified table
  fails `writerTablePolicy.test.ts`. That check, not the version number, is what
  guards a new table.
