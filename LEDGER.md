# Ledger

Append-only. Never edit or delete rows; to correct or update, append a new row with the same
task ID — the last row for an ID wins. Statuses: done, pushed, partial, blocked, unverified,
approved, rework.

| Task  | Status | Commit | Date | Notes |
|-------|--------|--------|------|-------|
| S1.T1 | done   | 153bd14 | 2026-07-18 | capability contracts + hasCapability guard |
| S1.T2 | done   | aaa801a | 2026-07-18 | SyncCoordinator registry |
| S1.T1 | rework | 153bd14 | 2026-07-18 | contracts invented, not derived from the cloud surface; branded ids forced casts in every test; hasCapability did not narrow; tests asserted `typeof === 'function'` only |
| S1.T2 | rework | aaa801a | 2026-07-18 | registry array handed out by reference; redundant capability re-check |
| S1.T1 | done   | 78dd9b6 | 2026-07-18 | reworked: contracts derived from cloudClient/cloudObservable; SyncObservable structurally matches CloudObservable so adapters map without casts; behavioural tests |
| S1.T2 | done   | 78dd9b6 | 2026-07-18 | reworked in the same commit (types and coordinator are interdependent — a split would leave the first commit uncompilable) |
