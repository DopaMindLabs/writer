import { db } from '@/db/db';

export const deleteSpaceCascade = async (spaceId: string): Promise<void> => {
  await db.transaction(
    'rw',
    [
      db.spaces,
      db.sections,
      db.docs,
      db.notes,
      db.annotations,
      db.citations,
      db.connections,
      db.palettes,
      db.backups,
      db.syncs,
      db.syncConfigs,
    ],
    async () => {
      const docIds = await db.docs.where({ spaceId }).primaryKeys();
      if (docIds.length > 0) {
        await db.annotations.where('docId').anyOf(docIds).delete();
      }
      await db.docs.where({ spaceId }).delete();
      await db.sections.where({ spaceId }).delete();
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
