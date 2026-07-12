---
name: change-writer-persistence
description: >
  Guardrails and checklist for changes to the Writer database schema, Dexie stores,
  migrations, doc repository, archives, backups, or revisions. Use when modifying
  src/db/ or src/lib/docs/. Trigger terms: "schema", "migration", "dexie", "table",
  "stores.ts", "LoremDB", "docRepository", "backup", "revision", "archive".
version: 1.1.0
tags: [persistence, database, dexie, schema, migration]
---

# Change Writer Persistence

## Persistence architecture

```
src/db/
├── stores.ts       STORES constant — single source of truth for the schema spec.
│                   The cloud crypto layer derives per-table encryption rules from this.
├── schema.ts       TypeScript row types (Doc, Space, Section, …).
├── LoremDB.ts      Dexie subclass; tables typed from schema.ts; version(1) applies STORES.
├── db.ts           Singleton export: buildDb() → LoremDB (re-exported as `db`).
├── buildDb.ts      Factory: plain LoremDB or cloud-enabled LoremDB depending on gates.
├── seed.ts         resetAndReseed — wipes and re-populates for dev/test.
└── buildDb.test.ts Verifies cloud toggle and sticky-schema behaviour.

src/lib/docs/
├── index.ts        Public re-export barrel — all callers import from here.
├── docRepository.ts  Single write path for docs: createDoc, updateDocBody,
│                     updateDocMeta, setDocStatus, renameDoc, restoreDocs, seedDocCrdt*.
├── emptyBody.ts    EMPTY_LEXICAL_JSON constant.
└── deleteDocCascade.ts Cascading delete (doc + docUpdates + annotations + revisions).
```

* `seedDocCrdt` must be called **after** the Dexie transaction that creates the row.

## Synced vs unsynced stores

See `work-on-cloud-sync` for the full list. In summary:

- **Synced** (field-encrypted, leave the device): `spaces`, `sections`, `docs`, `notes`,
  `noteAttachments`, `annotations`, `citations`, `connections`, `revisions`, `palettes`.
- **Local-only** (never leave): `settings`, `backups`, `syncs`, `syncConfigs`,
  `docInspectorConfigs`, `meta`, `docUpdates`.
- **Synced but special**: `cloudCrypto` — passphrase-wrapped escrow; must always sync.

## Schema-change checklist

First classify the change.

### Non-indexed field on an existing row type

1. Update the type in `src/db/schema.ts`.
2. Update constructors, repositories, codecs, archive/import paths, and tests that create the row.
3. Do **not** change `STORES` or bump Dexie's version when indexes are unchanged.
4. For a synced table, verify the field is absent from `plaintextFieldsFor()` and add
   `tableRules` / middleware assertions proving it is encrypted at rest.

### Table, primary-key, or index change

1. Update `STORES` in `src/db/stores.ts`.
2. Add or update the typed `Table` property in `src/db/LoremDB.ts`.
3. Add a monotonically higher Dexie `version()` and an upgrade callback when existing rows
   need migration. Never reuse a version.
4. Add a focused DB migration/schema test alongside the DB implementation.
5. Decide replication separately: add local-only tables to `UNSYNCED` in `buildDb.ts`.
6. Add a synced content table to `SYNCED_TABLES`; `cloudCrypto` is the special synced,
   already-wrapped escrow and is not row-encrypted.
7. Update cascades, archives, restore/import, backup, and revision paths where relevant.
8. Find every `db.<tableName>` caller and verify its assumptions.

## Archives, backups, and revisions

| Feature | Storage | Key files |
|---------|---------|-----------|
| Space archive (zip export/import) | Local download | `src/lib/format/buildSpaceArchive.ts`, `src/lib/backup/` |
| Auto-backup | `backups` table (local-only) | `src/lib/backup/` |
| Revisions (doc history) | `revisions` table (synced) | `src/lib/revisions/` |
| Folder sync | `syncs` / `syncConfigs` tables + File System Access API | `src/lib/sync/` |

## Hard rules

- Never mutate `STORES` without a version bump in `LoremDB`.
- Never add a field to a synced table without verifying the encryption middleware
  covers it (`plaintextFieldsFor` in `src/lib/cloud/crypto/tableRules.ts`).
- `docUpdates` must remain local-only — it is the CRDT update log and is rebuilt
  on each device from the shared `docs.body` seed.
- `updateDocBody` in `src/lib/docs/docRepository.ts` is the **single write path** for
  document body changes. Do not write `db.docs` directly outside this module.
