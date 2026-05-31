import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Doc, Section } from '@/db/schema';

interface Keyed<T> { key: string; value: T }

// useLiveQuery is stale-while-revalidate: on a deps change it keeps returning
// the previous result until the new query resolves. For per-space queries this
// surfaces the prior space's rows under the new spaceId for a frame (e.g. the
// WriteScreen redirect navigating to the old space's first doc). Tag each
// emission with the key it was computed for and return the value only while
// that key still matches the current one; otherwise report loading (undefined).
// The querier returns a single { key, value } object so dexie's internal result
// stays referentially stable between renders with no new emission — reading
// `.value` off that stable object preserves array identity (keeps downstream
// useMemo deps from churning).
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
