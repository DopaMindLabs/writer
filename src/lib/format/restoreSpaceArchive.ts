import { db } from '@/db/db';
import { invariant } from '@/lib/invariant';
import { restoreDocs, seedDocsCrdt, docBodyBaselineKey } from '@/lib/docs';
import { collabSeedKey } from '@/lib/collab/seedKey';
import { broadcastDocReload } from '@/lib/collab/docReloadChannel';
import { createSpaceBackup } from '@/lib/backup/createSpaceBackup';
import { remintedMetadata } from '@/lib/writerSyncIntegration/writerEntityMetadata';
import type { ParsedSpaceArchive } from './parseSpaceArchive';

const RESTORE_TABLES = [
  db.spaces,
  db.sections,
  db.docs,
  db.notes,
  db.noteAttachments,
  db.annotations,
  db.citations,
  db.connections,
  db.revisions,
  db.palettes,
  db.writerNotebooks,
  db.writerNotebookPages,
  db.writerNotebookAssets,
  db.docInspectorConfigs,
  db.docUpdates,
  db.meta,
];

const deleteSpaceContent = async (spaceId: string): Promise<void> => {
  const docIds = await db.docs.where({ spaceId }).primaryKeys();
  const notebookIds = await db.writerNotebooks.where({ spaceId }).primaryKeys();
  const notebookPageIds = await db.writerNotebookPages.where({ spaceId }).primaryKeys();
  const notebookAssetIds = await db.writerNotebookAssets.where({ spaceId }).primaryKeys();
  if (docIds.length > 0) {
    await db.annotations.where('docId').anyOf(docIds).delete();
    await db.revisions.where('docId').anyOf(docIds).delete();
    // Clear the pre-restore CRDT log and seed markers so the restored docs
    // re-seed cleanly from their archived bodies instead of replaying stale state.
    await db.docUpdates.where('docId').anyOf(docIds).delete();
    await db.meta.bulkDelete(docIds.map(collabSeedKey));
    await db.meta.bulkDelete(docIds.map(docBodyBaselineKey));
  }
  await db.docs.where({ spaceId }).delete();
  await db.sections.where({ spaceId }).delete();
  await db.notes.where({ spaceId }).delete();
  await db.noteAttachments.where({ spaceId }).delete();
  await db.citations.where({ spaceId }).delete();
  await db.connections.where({ spaceId }).delete();
  await db.palettes.where({ spaceId }).delete();
  if (notebookAssetIds.length > 0) await db.writerNotebookAssets.bulkDelete(notebookAssetIds);
  if (notebookPageIds.length > 0) await db.writerNotebookPages.bulkDelete(notebookPageIds);
  if (notebookIds.length > 0) await db.writerNotebooks.bulkDelete(notebookIds);
  await db.docInspectorConfigs.delete(spaceId);
};

/**
 * Write the archive back over the space. Every row takes a fresh mutation id and
 * logical time: a restore is a material change on this device, and re-putting a
 * stored `mutationId` would journal an operation the other devices have already
 * accepted — they would discard the restored rows as replays while honouring the
 * deletions that preceded them, emptying the space everywhere but here.
 */
const putArchiveContent = async (archive: ParsedSpaceArchive): Promise<void> => {
  await db.spaces.put(remintedMetadata(archive.space));
  await db.sections.bulkPut(archive.sections.map(remintedMetadata));
  await restoreDocs(archive.docs.map(remintedMetadata));
  await db.notes.bulkPut(archive.notes.map(remintedMetadata));
  await db.noteAttachments.bulkPut(archive.attachments.map(remintedMetadata));
  await db.annotations.bulkPut(archive.annotations.map(remintedMetadata));
  await db.citations.bulkPut(archive.citations.map(remintedMetadata));
  await db.connections.bulkPut(archive.connections.map(remintedMetadata));
  await db.revisions.bulkPut(archive.revisions.map(remintedMetadata));
  await db.palettes.bulkPut(archive.palettes.map(remintedMetadata));
  await db.writerNotebooks.bulkPut(archive.writerNotebooks.map(remintedMetadata));
  await db.writerNotebookPages.bulkPut(archive.writerNotebookPages.map(remintedMetadata));
  await db.writerNotebookAssets.bulkPut(archive.writerNotebookAssets.map(remintedMetadata));
  if (archive.docInspectorConfig) {
    await db.docInspectorConfigs.put(archive.docInspectorConfig);
  }
};

/**
 * Replaces the content of an existing space with an archive of that same
 * space. A snapshot of the current state is stored first, so a restore is
 * itself recoverable. Open editors in other tabs are told to reload the fresh
 * seed via {@link broadcastDocReload}.
 */
export const restoreSpaceArchive = async (
  spaceId: string,
  archive: ParsedSpaceArchive,
): Promise<void> => {
  invariant(
    archive.space.id === spaceId,
    'This archive belongs to a different space — use Import to bring it in as a new space',
  );
  const space = await db.spaces.get(spaceId);
  invariant(space, `Space not found: ${spaceId}`);

  await createSpaceBackup(spaceId, { kind: 'snapshot', label: 'pre-restore' });

  await db.transaction('rw', RESTORE_TABLES, async () => {
    await deleteSpaceContent(spaceId);
    await putArchiveContent(archive);
  });

  // Re-seed CRDT state from the restored bodies after the transaction commits —
  // seeding runs a headless editor and cannot run inside a Dexie transaction. The
  // stale log and seed markers were cleared above, so trySeed plants a fresh seed.
  await seedDocsCrdt(archive.docs);

  // Restore runs from a settings surface with no editor mounted, and the re-seed
  // starts a fresh CRDT lineage. Tell any tab that has one of these docs open to
  // reload the fresh seed (by remounting) instead of keeping its stale Y.Doc and
  // clobbering the restored body on its next autosave.
  broadcastDocReload(archive.docs.map((doc) => doc.id));
};
