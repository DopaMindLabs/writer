/**
 * The base `version(1)` schema spec — the tables the collaborative-editing branch
 * shipped. Kept separate from the {@link LoremDB} class so the cloud-sync layer
 * can derive per-table rules (which fields sync, which are encrypted) from the
 * same definition. Do not change these specs: existing installs created the DB
 * at version 1 with exactly this shape, so new tables belong in a later version
 * (see {@link PDF_STORES}), never here.
 */
export const BASE_STORES: Record<string, string> = {
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

/**
 * PDF media library tables, added in `version(2)`. Local-only (never synced);
 * see the cloud `UNSYNCED` list. `pdfAnnotations` joins here in its own task.
 */
export const PDF_STORES: Record<string, string> = {
  media: 'id, spaceId, createdAt, [spaceId+createdAt]',
  pdfAnnotations: 'id, mediaId, spaceId, page, createdAt, [mediaId+page]',
};

/** The full schema across all versions — the single source of truth for table names. */
export const STORES: Record<string, string> = { ...BASE_STORES, ...PDF_STORES };
