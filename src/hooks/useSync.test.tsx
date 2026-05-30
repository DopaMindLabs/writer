import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { sampleSpace } from '@/test/fixtures';
import { DEFAULT_INTERVAL_MIN, INHERIT_INTERVAL } from '@/lib/sync/folderSync';
import { useDefaultInterval, useSpaceInterval, useSyncHistory } from './useSync';
import { useSyncFolder } from './useSyncFolder';

describe('useSync hooks', () => {
  beforeEach(async () => {
    await db.spaces.put(sampleSpace);
  });

  it('useDefaultInterval falls back to the default then reflects config', async () => {
    const { result } = renderHook(() => useDefaultInterval());
    await waitFor(() => { expect(result.current).toBe(DEFAULT_INTERVAL_MIN); });

    await db.syncConfigs.put({ spaceId: 'global', intervalMin: 30 });
    await waitFor(() => { expect(result.current).toBe(30); });
  });

  it('useSpaceInterval resolves inheritance and overrides', async () => {
    await db.syncConfigs.put({ spaceId: 'global', intervalMin: 30 });
    const { result } = renderHook(() => useSpaceInterval(sampleSpace.id));
    await waitFor(() =>
      { expect(result.current).toEqual({ own: INHERIT_INTERVAL, effective: 30 }); },
    );

    await db.syncConfigs.put({ spaceId: sampleSpace.id, intervalMin: 5 });
    await waitFor(() =>
      { expect(result.current).toEqual({ own: 5, effective: 5 }); },
    );
  });

  it('useSyncHistory returns newest-first rows for a space', async () => {
    await db.syncs.bulkPut([
      { id: 'a', spaceId: sampleSpace.id, when: 100, kind: 'manual', status: 'ok', size: 1 },
      { id: 'b', spaceId: sampleSpace.id, when: 200, kind: 'auto', status: 'ok', size: 2 },
      { id: 'c', spaceId: 'other', when: 300, kind: 'auto', status: 'ok', size: 3 },
    ]);
    const { result } = renderHook(() => useSyncHistory(sampleSpace.id));
    await waitFor(() => { expect(result.current).toHaveLength(2); });
    expect(result.current.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('useSyncFolder reports last synced from the syncs table', async () => {
    await db.syncs.put({
      id: 'x',
      spaceId: sampleSpace.id,
      when: 1234,
      kind: 'manual',
      status: 'ok',
      size: 1,
    });
    const { result } = renderHook(() => useSyncFolder());
    await waitFor(() => { expect(result.current.lastSyncedAt).toBe(1234); });
    // jsdom has no showDirectoryPicker.
    expect(result.current.supported).toBe(false);
    expect(result.current.folderName).toBeNull();
  });
});
