# Ledger

Append-only. Never edit or delete rows; to correct or update, append a new row with the same
task ID — the last row for an ID wins. Statuses: done, pushed, partial, blocked, unverified,
approved, rework.

| Task  | Status | Commit | Date | Notes |
|-------|--------|--------|------|-------|
| S1.T1 | done   | 153bd14 | 2026-07-18 | capability contracts + hasCapability guard |
| S1.T2 | done   | aaa801a | 2026-07-18 | SyncCoordinator registry |
