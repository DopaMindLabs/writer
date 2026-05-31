import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Doc, Section } from '@/db/schema';

export const useSections = (
  spaceId: string | null | undefined,
): Section[] | undefined => {
  return useLiveQuery(
    async () => {
      if (!spaceId) return [];
      return db.sections.where('spaceId').equals(spaceId).sortBy('order');
    },
    [spaceId],
  );
};

export const useDocuments = (
  spaceId: string | null | undefined,
): Doc[] | undefined => {
  return useLiveQuery(
    async () => {
      if (!spaceId) return [];
      return db.docs.where('spaceId').equals(spaceId).toArray();
    },
    [spaceId],
  );
};

export const useDocument = (docId: string | null | undefined) => {
  return useLiveQuery(
    () => (docId ? db.docs.get(docId) : undefined),
    [docId],
    undefined,
  );
};
