import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Connection } from '@/db/schema';

export function useConnections(
  worldId: string | null | undefined,
): Connection[] {
  return (
    useLiveQuery(
      async () => {
        if (!worldId) return [];
        return db.connections.where('worldId').equals(worldId).toArray();
      },
      [worldId],
      [],
    ) ?? []
  );
}
