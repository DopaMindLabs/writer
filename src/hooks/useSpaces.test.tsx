import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { sampleSpace } from '@/test/fixtures';
import { useSpace, useSpaces } from './useSpaces';

describe('useSpaces', () => {
  it('returns spaces sorted descending by createdAt (newest first)', async () => {
    await db.spaces.bulkPut([
      { ...sampleSpace, id: 'a', createdAt: 1, updatedAt: 99 },
      { ...sampleSpace, id: 'b', createdAt: 3, updatedAt: 10 },
      { ...sampleSpace, id: 'c', createdAt: 2, updatedAt: 50 },
    ]);

    const { result } = renderHook(() => useSpaces());
    await waitFor(() => {
      expect(result.current?.map((s) => s.id)).toEqual(['b', 'c', 'a']);
    });
  });
});

describe('useSpace', () => {
  it('returns the matching space record', async () => {
    await db.spaces.put(sampleSpace);
    const { result } = renderHook(() => useSpace('s1'));
    await waitFor(() => expect(result.current?.id).toBe('s1'));
  });

  it('returns undefined for null id', async () => {
    await db.spaces.put(sampleSpace);
    const { result } = renderHook(() => useSpace(null));
    await waitFor(() => expect(result.current).toBeUndefined());
  });
});
