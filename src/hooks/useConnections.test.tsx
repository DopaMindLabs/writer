import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { FIXED_TIME } from '@/test/fixtures';
import { useConnections } from './useConnections';

describe('useConnections', () => {
  it('returns connections for the given space', async () => {
    await db.connections.bulkPut([
      {
        id: 'c1',
        spaceId: 's1',
        fromNoteId: 'a',
        toNoteId: 'b',
        createdAt: FIXED_TIME,
      },
      {
        id: 'c2',
        spaceId: 's1',
        fromNoteId: 'b',
        toNoteId: 'c',
        createdAt: FIXED_TIME,
      },
    ]);
    const { result } = renderHook(() => useConnections('s1'));
    await waitFor(() => expect(result.current).toHaveLength(2));
  });

  it('returns empty array when spaceId is null', async () => {
    const { result } = renderHook(() => useConnections(null));
    await waitFor(() => expect(result.current).toEqual([]));
  });
});
