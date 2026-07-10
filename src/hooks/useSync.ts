import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { SyncEntry } from '@/db/schema';
import {
  DEFAULT_INTERVAL_MIN,
  INHERIT_INTERVAL,
  getWritePermissionState,
} from '@/lib/sync/folderSync';

export const useDefaultInterval = (): number =>
  useLiveQuery(async () => {
    const row = await db.syncConfigs.get('global');
    return row ? row.intervalMin : DEFAULT_INTERVAL_MIN;
  }, []) ?? DEFAULT_INTERVAL_MIN;

export interface SpaceIntervalState {
  own: number;
  effective: number;
}

export const useSpaceInterval = (
  spaceId: string | null | undefined,
): SpaceIntervalState =>
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
  ) ?? { own: INHERIT_INTERVAL, effective: DEFAULT_INTERVAL_MIN };

export interface FolderPermissionState {
  granted: boolean;
  lapsed: boolean;
  refresh: () => void;
}

export const useFolderPermission = (
  folderName: string | null,
): FolderPermissionState => {
  const [state, setState] = useState<
    Awaited<ReturnType<typeof getWritePermissionState>>
  >('unknown');

  const refresh = useCallback(() => {
    void getWritePermissionState().then(setState);
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => {
      refresh();
    };
    window.addEventListener('focus', onFocus);
    const id = window.setInterval(refresh, 5_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(id);
    };
  }, [refresh, folderName]);

  return {
    granted: state === 'granted' || state === 'unknown',
    lapsed: state === 'prompt' || state === 'denied',
    refresh,
  };
};

export const useSyncHistory = (spaceId?: string | null): SyncEntry[] =>
  useLiveQuery(
    async () => {
      const rows = spaceId
        ? await db.syncs.where('spaceId').equals(spaceId).toArray()
        : await db.syncs.toArray();
      return rows.sort((a, b) => b.when - a.when);
    },
    [spaceId],
    [],
  );
