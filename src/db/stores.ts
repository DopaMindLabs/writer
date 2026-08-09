/**
 * The single source of truth for the schema spec. Kept separate from the
 * {@link LoremDB} class so the cloud-sync layer can derive per-table rules
 * (which fields sync, which are encrypted) from the same definition.
 *
 * **One declared version.** Writer has no users, so there is nothing to migrate
 * and no backward compatibility to keep. Add a table here; do not add a
 * `version(n)`. Wipe and reseed a stale local database rather than writing a
 * migration for it.
 */
export const STORES: Record<string, string> = {
  syncOperations: 'operationId, accessScopeId, [entityTable+entityId]',
  syncAttachmentChunks: '[attachmentId+index], attachmentId, accessScopeId',
  syncInbox: 'operationId, [entityTable+entityId]',
  syncTombstones: '[entityTable+entityId], accessScopeId',
  syncProviderBindings: '[scopeId+providerInstanceId], scopeId',
  trustedDevices: 'deviceId, principalId',
  spaces: 'id, createdAt, updatedAt',
  sections:
    'id, spaceId, parentSectionId, order, [spaceId+order], [spaceId+parentSectionId]',
  docs: 'id, spaceId, sectionId, updatedAt, [spaceId+sectionId]',
  docUpdates: '++id, docId',
  notes: 'id, spaceId, kind, createdAt',
  noteAttachments: 'id, noteId, spaceId, [noteId+createdAt]',
  writerNotebooks: 'id, spaceId',
  writerNotebookPages: 'id, notebookId, spaceId',
  writerNotebookAssets: 'id, notebookId, spaceId',
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
