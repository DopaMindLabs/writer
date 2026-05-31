import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import type { Revision } from '@/db/schema';
import { useRevisions } from './useRevisions';

const makeRevision = (overrides: Partial<Revision>): Revision => ({
  id: overrides.id ?? 'r',
  docId: overrides.docId ?? 'd1',
  body: overrides.body ?? 'body',
  text: overrides.text ?? 'body',
  wordCount: overrides.wordCount ?? 1,
  kind: overrides.kind ?? 'auto',
  createdAt: overrides.createdAt ?? 0,
  pinned: overrides.pinned,
  label: overrides.label,
});

describe('useRevisions', () => {
  it('returns revisions for the doc sorted by createdAt descending', async () => {
    await db.revisions.bulkPut([
      makeRevision({ id: 'older', createdAt: 100 }),
      makeRevision({ id: 'newest', createdAt: 300 }),
      makeRevision({ id: 'middle', createdAt: 200 }),
      makeRevision({ id: 'other-doc', docId: 'd2', createdAt: 9999 }),
    ]);
    const { result } = renderHook(() => useRevisions('d1'));
    await waitFor(() => {
      expect(result.current.map((r) => r.id)).toEqual([
        'newest',
        'middle',
        'older',
      ]);
    });
  });

  it('returns empty array when docId is null', async () => {
    const { result } = renderHook(() => useRevisions(null));
    await waitFor(() => { expect(result.current).toEqual([]); });
  });

  it('returns empty array when docId is undefined', async () => {
    const { result } = renderHook(() => useRevisions(undefined));
    await waitFor(() => { expect(result.current).toEqual([]); });
  });
});
