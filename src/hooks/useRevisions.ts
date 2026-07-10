import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Revision } from '@/db/schema';

export const useRevisions = (
  docId: string | null | undefined,
): Revision[] => {
  return useLiveQuery(
    async () => {
      if (!docId) return [];
      const rows = await db.revisions.where('docId').equals(docId).toArray();
      return rows.sort((a, b) => b.createdAt - a.createdAt);
    },
    [docId],
    [],
  );
};
