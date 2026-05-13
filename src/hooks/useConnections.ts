import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Connection } from '@/db/schema';

export function useConnections(
  spaceId: string | null | undefined,
): Connection[] {
  return (
    useLiveQuery(
      async () => {
        if (!spaceId) return [];
        return db.connections.where('spaceId').equals(spaceId).toArray();
      },
      [spaceId],
      [],
    ) ?? []
  );
}
