import { db } from '@/db/db';
import type { Revision } from '@/db/schema';
import { useEncryptedLiveQuery } from './useEncryptedLiveQuery';

export const useRevisions = (
  docId: string | null | undefined,
): Revision[] => {
  return useEncryptedLiveQuery(
    async () => {
      if (!docId) return [];
      const rows = await db.revisions.where('docId').equals(docId).toArray();
      return rows.sort((a, b) => b.createdAt - a.createdAt);
    },
    [docId],
    [],
  );
};
