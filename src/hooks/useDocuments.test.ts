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
      expect(result.current.map((s) => s.id)).toEqual(['b', 'a']);
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
