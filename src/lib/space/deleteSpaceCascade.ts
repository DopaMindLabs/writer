import { db } from '@/db/db';
import { collabSeedKey } from '@/lib/collab/seedKey';
import { docBodyBaselineKey } from '@/lib/docs';

export const deleteSpaceCascade = async (spaceId: string): Promise<void> => {
  await db.transaction(
    'rw',
    [
      db.spaces,
      db.sections,
      db.docs,
      db.notes,
      db.noteAttachments,
      db.annotations,
      db.revisions,
      db.citations,
      db.connections,
      db.palettes,
      db.backups,
      db.syncs,
      db.syncConfigs,
      db.docUpdates,
      db.meta,
      db.media,
      db.pdfAnnotations,
    ],
    async () => {
      const docIds = await db.docs.where({ spaceId }).primaryKeys();
      if (docIds.length > 0) {
        await db.annotations.where('docId').anyOf(docIds).delete();
        await db.revisions.where('docId').anyOf(docIds).delete();
        // Collaboration state is keyed by docId and lives outside the doc row:
        // clear the CRDT update log and the seed markers so a later restore or
        // import of the same id starts from a clean, correctly-seeded state.
        await db.docUpdates.where('docId').anyOf(docIds).delete();
        await db.meta.bulkDelete(docIds.map(collabSeedKey));
        await db.meta.bulkDelete(docIds.map(docBodyBaselineKey));
      }
      await db.docs.where({ spaceId }).delete();
      await db.media.where({ spaceId }).delete();
      await db.pdfAnnotations.where({ spaceId }).delete();
      await db.sections.where({ spaceId }).delete();
      await db.noteAttachments.where({ spaceId }).delete();
      await db.notes.where({ spaceId }).delete();
      await db.citations.where({ spaceId }).delete();
      await db.connections.where({ spaceId }).delete();
      await db.palettes.where({ spaceId }).delete();
      await db.backups.where('scope').equals(spaceId).delete();
      await db.syncs.where({ spaceId }).delete();
      await db.syncConfigs.delete(spaceId);
      await db.spaces.delete(spaceId);
    },
  );
};
