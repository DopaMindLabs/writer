import { db } from '@/db/db';
import { invariant } from '@/lib/invariant';
import { createSpaceBackup } from '@/lib/backup/createSpaceBackup';
import { useUI } from '@/store/ui';
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
  db.docInspectorConfigs,
];

const deleteSpaceContent = async (spaceId: string): Promise<void> => {
  const docIds = await db.docs.where({ spaceId }).primaryKeys();
  if (docIds.length > 0) {
    await db.annotations.where('docId').anyOf(docIds).delete();
    await db.revisions.where('docId').anyOf(docIds).delete();
  }
  await db.docs.where({ spaceId }).delete();
  await db.sections.where({ spaceId }).delete();
  await db.notes.where({ spaceId }).delete();
  await db.noteAttachments.where({ spaceId }).delete();
  await db.citations.where({ spaceId }).delete();
  await db.connections.where({ spaceId }).delete();
  await db.palettes.where({ spaceId }).delete();
  await db.docInspectorConfigs.delete(spaceId);
};

const putArchiveContent = async (archive: ParsedSpaceArchive): Promise<void> => {
  await db.spaces.put(archive.space);
  await db.sections.bulkPut(archive.sections);
  await db.docs.bulkPut(archive.docs);
  await db.notes.bulkPut(archive.notes);
  await db.noteAttachments.bulkPut(archive.attachments);
  await db.annotations.bulkPut(archive.annotations);
  await db.citations.bulkPut(archive.citations);
  await db.connections.bulkPut(archive.connections);
  await db.revisions.bulkPut(archive.revisions);
  await db.palettes.bulkPut(archive.palettes);
  if (archive.docInspectorConfig) {
    await db.docInspectorConfigs.put(archive.docInspectorConfig);
  }
};

/**
 * Replaces the content of an existing space with an archive of that same
 * space. A snapshot of the current state is stored first, so a restore is
 * itself recoverable. Open editors are remounted via the restore nonce.
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

  const { bumpRestoreNonce } = useUI.getState();
  for (const doc of archive.docs) {
    bumpRestoreNonce(doc.id);
  }
};
