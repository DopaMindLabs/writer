import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Backup } from '@/db/schema';

export const useBackups = (spaceId: string | null | undefined): Backup[] => {
  return useLiveQuery(
    async () => {
      if (!spaceId) return [];
      const rows = await db.backups.where('scope').equals(spaceId).toArray();
      return rows.sort((a, b) => b.when - a.when);
    },
    [spaceId],
    [],
  );
};
