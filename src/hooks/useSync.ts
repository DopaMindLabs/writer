import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { SyncEntry } from '@/db/schema';
import {
  DEFAULT_INTERVAL_MIN,
  INHERIT_INTERVAL,
  getWritePermissionState,
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

export interface FolderPermissionState {
  /** Permission is usable right now (granted, or no permission API). */
  granted: boolean;
  /** A folder is connected but the browser needs permission again this session. */
  lapsed: boolean;
  /** Re-query the live permission state. */
  refresh: () => void;
}

// Tracks the connected folder's write permission. Browsers only grant file
// access in response to a user gesture, so after a reload permission is
// "prompt" until the user acts — the UI uses `lapsed` to nudge a reconnect.
// Re-queries on mount, on window focus, on a short poll, and when the connected
// folder (folderName) changes.
export function useFolderPermission(
  folderName: string | null,
): FolderPermissionState {
  const [state, setState] = useState<
    Awaited<ReturnType<typeof getWritePermissionState>>
  >('unknown');

  const refresh = useCallback(() => {
    void getWritePermissionState().then(setState);
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
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
