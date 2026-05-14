import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import type { Citation } from '@/db/schema';
import { useCitations } from './useCitations';

const makeCitation = (overrides: Partial<Citation>): Citation => ({
  id: overrides.id ?? 'c',
  spaceId: overrides.spaceId ?? 's1',
  key: overrides.key ?? 'k',
  authors: 'A',
  title: 'T',
  year: overrides.year ?? 2000,
  type: 'misc',
  useCount: 0,
});

describe('useCitations', () => {
  it('returns citations sorted by year ascending', async () => {
    await db.citations.bulkPut([
      makeCitation({ id: 'a', key: 'a', year: 2020 }),
      makeCitation({ id: 'b', key: 'b', year: 1995 }),
      makeCitation({ id: 'c', key: 'c', year: 2010 }),
    ]);
    const { result } = renderHook(() => useCitations('s1'));
    await waitFor(() => {
      expect(result.current.map((c) => c.id)).toEqual(['b', 'c', 'a']);
    });
  });

  it('returns empty array when spaceId is null', async () => {
    const { result } = renderHook(() => useCitations(null));
    await waitFor(() => expect(result.current).toEqual([]));
  });
});
