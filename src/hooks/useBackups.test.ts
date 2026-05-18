import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import type { Backup } from '@/db/schema';
import { sampleSpace } from '@/test/fixtures';
import { useBackups } from './useBackups';

describe('useBackups', () => {
  it('returns an empty array when spaceId is null', async () => {
    const { result } = renderHook(() => useBackups(null));
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('returns an empty array when spaceId is undefined', async () => {
    const { result } = renderHook(() => useBackups(undefined));
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('returns backups scoped to the space, sorted by when DESC', async () => {
    await db.spaces.put(sampleSpace);
    const rows: Backup[] = [
      {
        id: 'b-old',
        when: 1000,
        scope: sampleSpace.id,
        kind: 'manual',
        format: 'md-zip',
        size: 1,
        payload: new Blob(['a']),
      },
      {
        id: 'b-mid',
        when: 2000,
        scope: sampleSpace.id,
        kind: 'manual',
        format: 'md-zip',
        size: 1,
        payload: new Blob(['b']),
      },
      {
        id: 'b-new',
        when: 3000,
        scope: sampleSpace.id,
        kind: 'manual',
        format: 'md-zip',
        size: 1,
        payload: new Blob(['c']),
      },
      {
        id: 'b-other',
        when: 9999,
        scope: 'other-space',
        kind: 'manual',
        format: 'md-zip',
        size: 1,
        payload: new Blob(['d']),
      },
    ];
    await db.backups.bulkPut(rows);
    const { result } = renderHook(() => useBackups(sampleSpace.id));
    await waitFor(() => expect(result.current).toHaveLength(3));
    expect(result.current.map((r) => r.id)).toEqual([
      'b-new',
      'b-mid',
      'b-old',
    ]);
  });
});
