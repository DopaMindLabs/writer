import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { sampleNote } from '@/test/fixtures';
import { useNotes } from './useNotes';

describe('useNotes', () => {
  it('returns notes for the given space', async () => {
    await db.notes.bulkPut([
      { ...sampleNote, id: 'n1' },
      { ...sampleNote, id: 'n2' },
    ]);
    const { result } = renderHook(() => useNotes('s1'));
    await waitFor(() => { expect(result.current).toHaveLength(2); });
  });

  it('returns empty array when spaceId is null', async () => {
    const { result } = renderHook(() => useNotes(null));
    await waitFor(() => { expect(result.current).toEqual([]); });
  });

  it('returns empty array when spaceId is undefined', async () => {
    const { result } = renderHook(() => useNotes(undefined));
    await waitFor(() => { expect(result.current).toEqual([]); });
  });
});
