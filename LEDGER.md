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
| S2.T1 | done   | 87291dc | 2026-07-18 | Dexie Cloud adapter: frameSync + keyDelivery, exhaustive phase/presence mapping. Deviation: phases, escrow presence and roles converted to enums (user direction, matches RouteName/NoteKind); SyncCapability stays a key union as string-enum members cannot index SyncProvider |
| S2.T2 | done   | 7feab49 | 2026-07-18 | boot composes providers via startWriterSync (new composition root src/lib/writerSync/); useAppBoot.test.ts and cloudClient.test.ts pass unmodified. Deviation: runbook placed the coordinator inside the cloud session assembly — that would cycle (cloudClient → adapter → cloudClient), so composition lives in its own module instead |
| S2.T1 | done   | b9972a3 | 2026-07-18 | keyDelivery removed from the adapter: ratchet failed at functions 87.99% vs floor 88, adapter covered 4/16. No consumer exists, so it was unreachable code. Baseline untouched; functions now 88.23%. Capability contract retained; implementation lands with its caller |
| Stage 2 | done | — | 2026-07-18 | gate: lint, typecheck, unit (2171 pass; 1 pre-existing failure in MobileNavDrawer.test.tsx, reproduces at branch point 24cf41b), e2e 331 pass, ratchet holds |
| S2b.T1 | done | c13e5b1 | 2026-07-18 | coordinator context + hook; keyDelivery restored with callers (both passphrase dialogs, panel escrow); KeyEscrowPresence replaces the facade union through flags/keyless section/device slots. Extractions: setup validation to a pure fn, unlock state machine to usePassphraseUnlockForm. Ratchet holds 88.14% |
| S3.T1 | done | 71d2887 | 2026-07-18 | scope corrected: the addon injects realms/members/roles via DEXIE_CLOUD_SCHEMA and throws on a redeclared primary key, so no version(2), no STORES change, no migration. Probe confirmed all three present at verno 1, already absent from SYNCED_TABLES and UNSYNCED. Delivered as regression tests only |
| S3.T2 | blocked | — | 2026-07-18 | typed realm accessors need DBRealm/DBRealmMember/DBRealmRole from dexie-cloud-common, a transitive dep the addon does not re-export. New direct dependency is a stop-and-ask; no consumer until Stage 4. Question logged |
| S3.T2 | done | — | 2026-07-18 | dissolved: no work needed. dexie-cloud-addon augments the Dexie interface with typed realms/members/roles, so they were always typed on LoremDB. The dependency escalation was my analysis error — package.json and lock reverted untouched |
