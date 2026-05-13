import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';

export function useWorlds() {
  return useLiveQuery(() => db.worlds.orderBy('updatedAt').reverse().toArray(), [], []);
}

export function useWorld(id: string | null | undefined) {
  return useLiveQuery(
    () => (id ? db.worlds.get(id) : undefined),
    [id],
    undefined,
  );
}
