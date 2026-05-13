import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Doc, Section } from '@/db/schema';

export function useSections(spaceId: string | null | undefined): Section[] {
  return (
    useLiveQuery(
      async () => {
        if (!spaceId) return [];
        return db.sections.where('spaceId').equals(spaceId).sortBy('order');
      },
      [spaceId],
      [],
    ) ?? []
  );
}

export function useDocuments(spaceId: string | null | undefined): Doc[] {
  return (
    useLiveQuery(
      async () => {
        if (!spaceId) return [];
        return db.docs.where('spaceId').equals(spaceId).toArray();
      },
      [spaceId],
      [],
    ) ?? []
  );
}

export function useDocument(docId: string | null | undefined) {
  return useLiveQuery(
    () => (docId ? db.docs.get(docId) : undefined),
    [docId],
    undefined,
  );
}
