import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import type { Citation } from '@/db/schema';
import { useCitations, usePagedCitations } from './useCitations';

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
    await waitFor(() => { expect(result.current).toEqual([]); });
  });

  it('returns empty array when spaceId is undefined', async () => {
    const { result } = renderHook(() => useCitations(undefined));
    await waitFor(() => { expect(result.current).toEqual([]); });
  });
});

describe('usePagedCitations', () => {
  const seed = async (count: number) => {
    await db.citations.bulkPut(
      Array.from({ length: count }, (_, i) =>
        makeCitation({
          id: `c${String(i)}`,
          key: `key${String(i)}`,
          year: 1990 + i,
        }),
      ),
    );
  };

  it('reports an empty result set as one empty page', async () => {
    const { result } = renderHook(() =>
      usePagedCitations('s1', { page: 0, pageSize: 5, query: '' }),
    );
    await waitFor(() => {
      expect(result.current).toEqual({
        rows: [],
        totalCount: 0,
        totalInSpace: 0,
        totalPages: 1,
        currentPage: 0,
      });
    });
  });

  it('returns only the requested page, year-ascending, with correct metadata', async () => {
    await seed(12);
    const { result } = renderHook(() =>
      usePagedCitations('s1', { page: 1, pageSize: 5, query: '' }),
    );
    await waitFor(() => {
      expect(result.current.rows.map((c) => c.id)).toEqual([
        'c5',
        'c6',
        'c7',
        'c8',
        'c9',
      ]);
      expect(result.current.totalCount).toBe(12);
      expect(result.current.totalInSpace).toBe(12);
      expect(result.current.totalPages).toBe(3);
      expect(result.current.currentPage).toBe(1);
    });
  });

  it('returns a partial final page', async () => {
    await seed(12);
    const { result } = renderHook(() =>
      usePagedCitations('s1', { page: 2, pageSize: 5, query: '' }),
    );
    await waitFor(() => {
      expect(result.current.rows.map((c) => c.id)).toEqual(['c10', 'c11']);
      expect(result.current.currentPage).toBe(2);
    });
  });

  it('clamps an out-of-range page into range', async () => {
    await seed(3);
    const { result } = renderHook(() =>
      usePagedCitations('s1', { page: 9, pageSize: 5, query: '' }),
    );
    await waitFor(() => {
      expect(result.current.currentPage).toBe(0);
      expect(result.current.rows).toHaveLength(3);
    });
  });

  it('filters by query across key, authors, title, and year, then pages the matches', async () => {
    await seed(8);
    await db.citations.put(
      makeCitation({ id: 'hit', key: 'needle-key', year: 2050 }),
    );
    const { result } = renderHook(() =>
      usePagedCitations('s1', { page: 0, pageSize: 5, query: 'needle' }),
    );
    await waitFor(() => {
      expect(result.current.rows.map((c) => c.id)).toEqual(['hit']);
      expect(result.current.totalCount).toBe(1);
      // The unfiltered space count is still reported for the header.
      expect(result.current.totalInSpace).toBe(9);
      expect(result.current.totalPages).toBe(1);
    });
  });

  it('does not leak citations from other spaces', async () => {
    await seed(2);
    await db.citations.put(
      makeCitation({ id: 'foreign', key: 'k', spaceId: 's2' }),
    );
    const { result } = renderHook(() =>
      usePagedCitations('s1', { page: 0, pageSize: 5, query: '' }),
    );
    await waitFor(() => {
      expect(result.current.totalInSpace).toBe(2);
      expect(result.current.rows.map((c) => c.id)).toEqual(['c0', 'c1']);
    });
  });

  it('returns the empty page when spaceId is null', async () => {
    await seed(2);
    const { result } = renderHook(() =>
      usePagedCitations(null, { page: 0, pageSize: 5, query: '' }),
    );
    await waitFor(() => {
      expect(result.current.totalInSpace).toBe(0);
      expect(result.current.rows).toEqual([]);
    });
  });
});
