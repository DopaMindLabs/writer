import { db } from '@/db/db';
import { invariant } from '@/lib/invariant';
import { restoreDocs, seedDocsCrdt } from '@/lib/docs';
import { collabSeedKey } from '@/lib/collab/seedKey';
import { broadcastDocReload } from '@/lib/collab/docReloadChannel';
import { createSpaceBackup } from '@/lib/backup/createSpaceBackup';
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
  db.docUpdates,
  db.shares,
  db.meta,
];

const deleteSpaceContent = async (spaceId: string): Promise<void> => {
  const docIds = await db.docs.where({ spaceId }).primaryKeys();
  if (docIds.length > 0) {
    await db.annotations.where('docId').anyOf(docIds).delete();
    await db.revisions.where('docId').anyOf(docIds).delete();
    // Clear the pre-restore CRDT log, seed markers and room membership so the
    // restored docs re-seed cleanly from their archived bodies — as unshared,
    // local docs — instead of replaying stale state.
    await db.docUpdates.where('docId').anyOf(docIds).delete();
    await db.meta.bulkDelete(docIds.map(collabSeedKey));
    await db.shares.bulkDelete(docIds);
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
  await restoreDocs(archive.docs);
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
