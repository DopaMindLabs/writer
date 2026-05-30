import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { SyncEntry } from '@/db/schema';
import {
  DEFAULT_INTERVAL_MIN,
  INHERIT_INTERVAL,
} from '@/lib/sync/folderSync';

// The global default auto-sync interval (minutes; 0 = off).
export function useDefaultInterval(): number {
  return (
    useLiveQuery(async () => {
      const row = await db.syncConfigs.get('global');
      return row ? row.intervalMin : DEFAULT_INTERVAL_MIN;
    }, []) ?? DEFAULT_INTERVAL_MIN
  );
}

export interface SpaceIntervalState {
  /** The space's own setting: INHERIT_INTERVAL when inheriting the default. */
  own: number;
  /** The interval actually in effect (after resolving inheritance). */
  effective: number;
}

export function useSpaceInterval(
  spaceId: string | null | undefined,
): SpaceIntervalState {
  return (
    useLiveQuery(
      async () => {
        if (!spaceId) {
          return { own: INHERIT_INTERVAL, effective: DEFAULT_INTERVAL_MIN };
        }
        const defaultRow = await db.syncConfigs.get('global');
        const defaultInterval = defaultRow
          ? defaultRow.intervalMin
          : DEFAULT_INTERVAL_MIN;
        const own = await db.syncConfigs.get(spaceId);
        const ownInterval = own ? own.intervalMin : INHERIT_INTERVAL;
        return {
          own: ownInterval,
          effective:
            ownInterval === INHERIT_INTERVAL ? defaultInterval : ownInterval,
        };
      },
      [spaceId],
    ) ?? { own: INHERIT_INTERVAL, effective: DEFAULT_INTERVAL_MIN }
  );
}

// Recent sync history. Pass a spaceId for one space, or omit for all spaces.
export function useSyncHistory(
  spaceId?: string | null,
): SyncEntry[] {
  return (
    useLiveQuery(
      async () => {
        const rows = spaceId
          ? await db.syncs.where('spaceId').equals(spaceId).toArray()
          : await db.syncs.toArray();
        return rows.sort((a, b) => b.when - a.when);
      },
      [spaceId],
      [],
    ) ?? []
  );
}
