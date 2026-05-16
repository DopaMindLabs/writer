import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { sampleDoc, sampleSpace } from '@/test/fixtures';
import { useSections, useDocuments, useDocument } from './useDocuments';
import { useCitations } from './useCitations';
import { useNotes } from './useNotes';
import { useConnections, useConnectionsForNote } from './useConnections';

describe('useDocuments hooks', () => {
  it('useSections returns an empty array when spaceId is null', async () => {
    const { result } = renderHook(() => useSections(null));
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('useDocuments returns an empty array when spaceId is undefined', async () => {
    const { result } = renderHook(() => useDocuments(undefined));
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('useDocument returns undefined when docId is null', async () => {
    const { result } = renderHook(() => useDocument(null));
    await waitFor(() => expect(result.current).toBeUndefined());
  });

  it('useDocuments returns docs filtered by space', async () => {
    await db.spaces.put(sampleSpace);
    await db.docs.put(sampleDoc);
    const { result } = renderHook(() => useDocuments(sampleSpace.id));
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].id).toBe(sampleDoc.id);
  });

  it('useCitations returns an empty array when spaceId is null', async () => {
    const { result } = renderHook(() => useCitations(null));
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('useNotes returns an empty array when spaceId is undefined', async () => {
    const { result } = renderHook(() => useNotes(undefined));
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('useConnections returns an empty array when spaceId is null', async () => {
    const { result } = renderHook(() => useConnections(null));
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('useConnectionsForNote returns the empty shape when noteId is null', async () => {
    const { result } = renderHook(() => useConnectionsForNote(null));
    await waitFor(() => {
      expect(result.current.incoming).toEqual([]);
      expect(result.current.outgoing).toEqual([]);
    });
  });
});
