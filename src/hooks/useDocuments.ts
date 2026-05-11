import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Doc, Section } from '@/db/schema';

export function useSections(worldId: string | null | undefined): Section[] {
  return (
    useLiveQuery(
      async () => {
        if (!worldId) return [];
        return db.sections.where('worldId').equals(worldId).sortBy('order');
      },
      [worldId],
      [],
    ) ?? []
  );
}

export function useDocuments(worldId: string | null | undefined): Doc[] {
  return (
    useLiveQuery(
      async () => {
        if (!worldId) return [];
        return db.docs.where('worldId').equals(worldId).toArray();
      },
      [worldId],
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
