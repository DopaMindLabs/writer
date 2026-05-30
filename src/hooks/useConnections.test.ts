import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { FIXED_TIME } from '@/test/fixtures';
import { useConnections, useConnectionsForNote } from './useConnections';

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
    await waitFor(() => { expect(result.current).toHaveLength(2); });
  });

  it('returns empty array when spaceId is null', async () => {
    const { result } = renderHook(() => useConnections(null));
    await waitFor(() => { expect(result.current).toEqual([]); });
  });

  it('returns empty array when spaceId is undefined', async () => {
    const { result } = renderHook(() => useConnections(undefined));
    await waitFor(() => { expect(result.current).toEqual([]); });
  });
});

describe('useConnectionsForNote', () => {
  beforeEach(async () => {
    await db.connections.bulkPut([
      {
        id: 'in1',
        spaceId: 's1',
        fromNoteId: 'a',
        toNoteId: 'target',
        createdAt: FIXED_TIME,
      },
      {
        id: 'out1',
        spaceId: 's1',
        fromNoteId: 'target',
        toNoteId: 'b',
        createdAt: FIXED_TIME,
      },
    ]);
  });

  it('partitions connections into incoming and outgoing for the note', async () => {
    const { result } = renderHook(() => useConnectionsForNote('target'));
    await waitFor(() => {
      expect(result.current.incoming).toHaveLength(1);
      expect(result.current.outgoing).toHaveLength(1);
    });
    expect(result.current.incoming[0].id).toBe('in1');
    expect(result.current.outgoing[0].id).toBe('out1');
  });

  it('returns the empty value when noteId is null', async () => {
    const { result } = renderHook(() => useConnectionsForNote(null));
    await waitFor(() => {
      expect(result.current.incoming).toEqual([]);
      expect(result.current.outgoing).toEqual([]);
    });
  });

  it('returns the empty value when noteId is undefined', async () => {
    const { result } = renderHook(() => useConnectionsForNote(undefined));
    await waitFor(() => {
      expect(result.current.incoming).toEqual([]);
      expect(result.current.outgoing).toEqual([]);
    });
  });
});
