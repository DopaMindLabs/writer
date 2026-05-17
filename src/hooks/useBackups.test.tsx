import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import type { Backup } from '@/db/schema';
import { useBackups } from './useBackups';

const makeBackup = (overrides: Partial<Backup>): Backup => ({
  id: overrides.id ?? 'b',
  when: overrides.when ?? 0,
  scope: overrides.scope ?? 's1',
  kind: overrides.kind ?? 'manual',
  format: 'md-zip',
  size: 1,
  payload: new Blob(['x']),
});

describe('useBackups', () => {
  it('returns backups for the space sorted by when descending', async () => {
    await db.backups.bulkPut([
      makeBackup({ id: 'older', when: 100 }),
      makeBackup({ id: 'newest', when: 300 }),
      makeBackup({ id: 'middle', when: 200 }),
      makeBackup({ id: 'other-space', scope: 's2', when: 9999 }),
    ]);
    const { result } = renderHook(() => useBackups('s1'));
    await waitFor(() => {
      expect(result.current.map((b) => b.id)).toEqual([
        'newest',
        'middle',
        'older',
      ]);
    });
  });

  it('returns empty array when spaceId is null', async () => {
    const { result } = renderHook(() => useBackups(null));
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('returns empty array when spaceId is undefined', async () => {
    const { result } = renderHook(() => useBackups(undefined));
    await waitFor(() => expect(result.current).toEqual([]));
  });
});
