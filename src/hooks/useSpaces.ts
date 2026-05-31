import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';

export function useSpaces() {
  return useLiveQuery(
    () => db.spaces.orderBy('createdAt').reverse().toArray(),
    [],
    [],
  );
}

export function useSpace(id: string | null | undefined) {
  return useLiveQuery(
    () => (id ? db.spaces.get(id) : undefined),
    [id],
    undefined,
  );
}
