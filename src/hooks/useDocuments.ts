import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Doc, Section } from '@/db/schema';

interface Keyed<T> { key: string; value: T }

const useKeyedLiveQuery = <T>(
  key: string | null | undefined,
  query: (key: string) => Promise<T>,
  emptyForNoKey: T,
): T | undefined => {
  const keyed = useLiveQuery<Keyed<T>>(async () => {
    if (!key) return { key: '', value: emptyForNoKey };
    return { key, value: await query(key) };
  }, [key]);
  if (keyed === undefined) return undefined;
  if (!key) return keyed.value;
  return keyed.key === key ? keyed.value : undefined;
};

export const useSections = (
  spaceId: string | null | undefined,
): Section[] | undefined =>
  useKeyedLiveQuery(
    spaceId,
    (id) => db.sections.where('spaceId').equals(id).sortBy('order'),
    [],
  );

export const useDocuments = (
  spaceId: string | null | undefined,
): Doc[] | undefined =>
  useKeyedLiveQuery(
    spaceId,
    (id) => db.docs.where('spaceId').equals(id).toArray(),
    [],
  );

export const useDocument = (docId: string | null | undefined) =>
  useLiveQuery(() => (docId ? db.docs.get(docId) : undefined), [docId], undefined);
