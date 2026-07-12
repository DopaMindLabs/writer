---
name: work-on-editor-collaboration
description: >
  Architecture guide and guardrails for the same-browser real-time CRDT collaboration
  layer (Yjs / Lexical / BroadcastChannel). Use when touching collab state, the Yjs
  provider, CRDT seed/snapshot, or multi-tab sync. Trigger terms: "collab", "yjs",
  "crdt", "multi-tab", "collaboration", "provider", "BroadcastChannel", "presence".
version: 1.1.0
tags: [collaboration, yjs, crdt, lexical]
---

# Work on Editor Collaboration

## What this layer is

Same-browser, real-time CRDT collaboration between tabs of the same browser instance.
It is **not** cross-device sync — that is Dexie Cloud (`work-on-cloud-sync`).

Yjs maintains a shared `Y.Doc` for each open document. `BroadcastChannelTransport`
propagates updates across tabs. The update log is persisted to `docUpdates` (local-only
Dexie table, never synced to the cloud).

## Architecture map

```
src/lib/collab/
├── types.ts                  Engine-agnostic interfaces (CollabStore, SyncTransport,
│                             PresenceState). No yjs imports — callers stay decoupled.
├── collabStore.ts            App-wide CollabStore singleton (wraps DexieCollabStore).
├── docReloadChannel.ts       BroadcastChannel for forcing a cross-tab editor remount.
├── editorRegistry.ts         Tracks which docIds have a live editor mounted.
├── seedKey.ts                Per-doc seed sentinel (prevents double-seeding).
└── yjs/
    ├── DexieCollabStore.ts   CollabStore → docUpdates table. Compacts at COMPACT_THRESHOLD.
    ├── YjsProvider.ts        Yjs sync protocol + awareness over transports.
    ├── providerFactory.ts    Creates a YjsProvider per docId on editor mount.
    ├── seed.ts               seedFromLexicalJson — headless editor → initial Y.Doc update.
    ├── snapshot.ts           Snapshot a live Y.Doc back to Lexical JSON (used by revisions).
    └── stubProvider.ts       Minimal Provider for headless / test contexts.
├── transport/
│   └── BroadcastChannelTransport.ts  Same-origin tab-to-tab transport.
```

## Public boundaries (callers use only these)

| Symbol | File | Purpose |
|--------|------|---------|
| `CollabStore`, `SyncTransport`, `PresenceState` | `src/lib/collab/types.ts` | Engine-agnostic contracts |
| `collabStore` | `src/lib/collab/collabStore.ts` | Singleton store for the app |
| `makeProviderFactory` | `src/lib/collab/yjs/providerFactory.ts` | Per-doc provider factory |
| `useCollab` | `src/hooks/useCollab.ts` | React hook giving `providerFactory` + cursor identity |
| `useDocCrdtReady` | `src/hooks/useDocCrdtReady.ts` | Gate editor mount until CRDT log seeded |
| `useDocReloadNonce` | `src/hooks/useDocReloadNonce.ts` | Force editor remount after cross-tab reset |

**Callers must not import from `src/lib/collab/yjs/` directly** (except `src/lib/docs/`
which seeds on creation).

## Save path (collab perspective)

Each edit has two paths: `YjsProvider` immediately appends the CRDT delta to
`docUpdates`; `AutosavePlugin` independently debounces serialised Lexical state through
`WriteSurface.handleChange` → `updateDocBody` → `docs.body`.

## Load path (collab perspective)

Editor mounts → `useDocCrdtReady` waits for `collabStore.reseedIfEmpty` → `YjsProvider`
loads `docUpdates` via `DexieCollabStore.loadAll` → applies to fresh `Y.Doc`.

## CRDT seed rules

- Every new doc row must call `seedDocCrdt(docId, body)` **after** the Dexie transaction
  commits. Running a headless editor inside a transaction is forbidden.
- `seedFromLexicalJson` (`src/lib/collab/yjs/seed.ts`) is the only function that creates
  a headless editor; all seeding flows through it.
- `collabStore.reseedIfEmpty` re-seeds on cloud sign-out data loss. It is idempotent.

## Hard rules

- Production Yjs engine code stays under `src/lib/collab/yjs/`. Callers use the
  `CollabStore` / `SyncTransport` interface; focused tests and archive restoration may
  import Yjs to exercise or restore the format.
- `docUpdates` is a local-only table (in `UNSYNCED` in `src/db/buildDb.ts`). Never
  move it to the synced table list.
- Never run a headless editor (`seedFromLexicalJson`) inside a Dexie transaction.
- Tests for collab code must use real Dexie (in-memory via `buildDb`) and not mock the
  store internals.

## Tests

| What | Where |
|------|-------|
| DexieCollabStore | `src/lib/collab/yjs/DexieCollabStore.test.ts` |
| YjsProvider | `src/lib/collab/yjs/YjsProvider.test.ts` |
| Seed | `src/lib/collab/yjs/seed.test.ts` |
| Snapshot | `src/lib/collab/yjs/snapshot.test.ts` |
| docReloadChannel | `src/lib/collab/docReloadChannel.test.ts` |
| useDocCrdtReady | `src/hooks/useDocCrdtReady.test.tsx` |

## Track this work as a todo list

Before you start, seed a todo list from the CRDT seed rules and hard rules for the collab
path you touch — one item per rule you must uphold (seed after commit, `docUpdates` stays
local-only, callers use the `CollabStore` interface, real Dexie in tests) — plus one per
test in the table above that your change affects (see
[AGENTS.md § "Todo tracking"](../../../AGENTS.md)). Mark exactly one item in-progress as you
begin it and completed the moment it is verified done, and append any newly discovered work
as new items. Keep the list current: it is the source of truth for what remains and the
backbone of any [handover](../handover-writer-work/SKILL.md).
