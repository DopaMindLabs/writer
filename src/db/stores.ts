/**
 * The single source of truth for the `version(1)` schema spec. Kept separate
 * from the {@link LoremDB} class so the cloud-sync layer can derive per-table
 * rules (which fields sync, which are encrypted) from the same definition.
 */
export const STORES: Record<string, string> = {
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
  shares: 'docId, roomId',
};
