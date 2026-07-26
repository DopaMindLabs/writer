/**
 * The single source of truth for the schema spec. Kept separate from the
 * {@link LoremDB} class so the cloud-sync layer can derive per-table rules
 * (which fields sync, which are encrypted) from the same definition.
 *
 * **One declared version, deliberately.** Writer is pre-release with no
 * installed databases to upgrade, so a table is added here rather than behind a
 * new `version(n)`. This costs nothing at runtime: Dexie's declared version is
 * not the IndexedDB version — it scales the declared number by ten and bumps the
 * underlying counter itself whenever the physical schema has to change. A
 * database created before a table was added therefore still opens, keeps its
 * rows, and gains the new store on next open.
 *
 * This covers *additive* changes only. Dropping a store, changing a primary key
 * or renaming an indexed field still discards rows on every existing database,
 * and there is no `upgrade()` callback anywhere in this repository to carry them
 * across — so a destructive change is a stop-and-ask. See
 * `docs/adr/0002-single-dexie-schema-version.md`.
 */
export const STORES: Record<string, string> = {
  syncOperations: 'operationId, accessScopeId, [entityTable+entityId]',
  syncInbox: 'operationId, [entityTable+entityId]',
  syncTombstones: '[entityTable+entityId], accessScopeId',
  syncProviderBindings: '[scopeId+providerInstanceId], scopeId',
  spaces: 'id, createdAt, updatedAt',
  sections:
    'id, spaceId, parentSectionId, order, [spaceId+order], [spaceId+parentSectionId]',
  docs: 'id, spaceId, sectionId, updatedAt, [spaceId+sectionId]',
  docUpdates: '++id, docId',
  notes: 'id, spaceId, kind, createdAt',
  noteAttachments: 'id, noteId, spaceId, [noteId+createdAt]',
  annotations: 'id, docId, kind, createdAt',
  citations: 'id, spaceId, year, [spaceId+key], [spaceId+year]',
  connections:
    'id, spaceId, fromNoteId, toNoteId, [spaceId+fromNoteId], [spaceId+toNoteId]',
  backups: 'id, when, scope, kind',
  revisions: 'id, docId, createdAt, kind, [docId+createdAt]',
  settings: 'key',
  palettes: 'id, spaceId',
  meta: 'key',
  syncs: 'id, spaceId, when, [spaceId+when]',
  syncConfigs: 'spaceId',
  docInspectorConfigs: 'spaceId',
};
