import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import {
  sampleDoc,
  sampleSection,
  sampleSubsection,
} from '@/test/fixtures';
import { useDocument, useDocuments, useSections } from './useDocuments';

describe('useSections', () => {
  it('returns sections sorted by order', async () => {
    await db.sections.bulkPut([
      { ...sampleSection, id: 'a', order: 2 },
      { ...sampleSubsection, id: 'b', order: 1, parentSectionId: 'a' },
    ]);
    const { result } = renderHook(() => useSections('s1'));
    await waitFor(() => {
      expect(result.current?.map((s) => s.id)).toEqual(['b', 'a']);
    });
  });

  it('returns empty array when spaceId is null', async () => {
    const { result } = renderHook(() => useSections(null));
    await waitFor(() => { expect(result.current).toEqual([]); });
  });

  it('returns empty array when spaceId is undefined', async () => {
    const { result } = renderHook(() => useSections(undefined));
    await waitFor(() => { expect(result.current).toEqual([]); });
  });
});

describe('useDocuments', () => {
  it('returns docs for the given space', async () => {
    await db.docs.bulkPut([
      { ...sampleDoc, id: 'd1' },
      { ...sampleDoc, id: 'd2' },
    ]);
    const { result } = renderHook(() => useDocuments('s1'));
    await waitFor(() => { expect(result.current).toHaveLength(2); });
  });

  it('returns empty array when spaceId is undefined', async () => {
    const { result } = renderHook(() => useDocuments(undefined));
    await waitFor(() => { expect(result.current).toEqual([]); });
  });

  it('returns empty array when spaceId is null', async () => {
    const { result } = renderHook(() => useDocuments(null));
    await waitFor(() => { expect(result.current).toEqual([]); });
  });
});

describe('useDocuments — cross-space staleness guard', () => {
  it('returns undefined synchronously after the key changes, before the new query resolves', async () => {
    await db.docs.bulkPut([
      { ...sampleDoc, id: 'd1', spaceId: 's1' },
      { ...sampleDoc, id: 'd2', spaceId: 's2' },
    ]);
    const { result, rerender } = renderHook(
      ({ sid }: { sid: string }) => useDocuments(sid),
      { initialProps: { sid: 's1' } },
    );
    await waitFor(() => {
      expect(result.current?.map((d) => d.id)).toEqual(['d1']);
    });
    rerender({ sid: 's2' });
    expect(result.current).toBeUndefined();
    await waitFor(() => {
      expect(result.current?.map((d) => d.id)).toEqual(['d2']);
    });
  });

  it('keeps array reference identity when no new emission occurs', async () => {
    await db.docs.put({ ...sampleDoc, id: 'd1', spaceId: 's1' });
    const { result, rerender } = renderHook(() => useDocuments('s1'));
    await waitFor(() => { expect(result.current).toBeDefined(); });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

describe('useDocument', () => {
  it('returns single doc by id', async () => {
    await db.docs.put(sampleDoc);
    const { result } = renderHook(() => useDocument('d1'));
    await waitFor(() => { expect(result.current?.id).toBe('d1'); });
  });

  it('returns undefined when docId is null', async () => {
    const { result } = renderHook(() => useDocument(null));
    await waitFor(() => { expect(result.current).toBeUndefined(); });
  });

  it('returns undefined when docId is undefined', async () => {
    const { result } = renderHook(() => useDocument(undefined));
    await waitFor(() => { expect(result.current).toBeUndefined(); });
  });
});
