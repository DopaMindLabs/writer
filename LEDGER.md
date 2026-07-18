# Ledger

Append-only. Never edit or delete rows; to correct or update, append a new row with the same
task ID — the last row for an ID wins. Statuses: done, pushed, partial, blocked, unverified,
approved, rework.

| Task  | Status | Commit | Date | Notes |
|-------|--------|--------|------|-------|
| S1.T1 | done | 153bd14 | 2026-07-18 | reconciled by planner: commit lacks trailer; contracts revised in 78dd9b6; merged via PR #186 |
| S1.T2 | done | aaa801a | 2026-07-18 | reconciled by planner: commit lacks trailer; revised in 78dd9b6; merged via PR #186 |
| S2.T1 | done | 87291dc | 2026-07-18 | keyDelivery methods later dropped as unconsumed (b9972a3, coverage ratchet); merged via PR #186 |
| S2.T2 | done | 7feab49 | 2026-07-18 | boot composed through coordinator via startWriterSync; merged via PR #186 |
| S2b.T1 | done | c13e5b1 | 2026-07-18 | executor-added unplanned task: key UI consumes keyDelivery through provider context; merged via PR #186 |
| S3.T1 | done | 71d2887 | 2026-07-18 | deviation: addon injects realms/members/roles itself (overrideParseStoresSpec) — no version(2); task became pin tests; merged via PR #186 |
| S4.T1 | done | 6677267 | 2026-07-18 | importSpaceArchive strips realmId on import; merged via PR #186 |
| S4.T2 | done | 3dc36de | 2026-07-18 | addon owns realmId (share = restamp, refuses signed-out); signed-in mint/delete path uncovered — needs e2e against real preview DB; merged via PR #186 |
| S5.T1 | partial | 4ed13b6 | 2026-07-18 | architecture.md boundary recorded (commit lacks trailer); cloud-sync-beta.md and technical-specification.md updates outstanding |
