import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import type { WriterNotebook, WriterNotebookPage } from '@/db/schema';
import { sampleMetadata } from '@/test/fixtures';
import { useWriterNotebookSummaries, useWriterNotebooks } from './useWriterNotebooks';

const notebook = (id: string, spaceId: string): WriterNotebook => ({
  ...sampleMetadata(spaceId),
  id,
  spaceId,
  title: id,
  createdAt: 1,
  updatedAt: 1,
});

const page = (id: string, notebookId: string, spaceId: string): WriterNotebookPage => ({
  ...sampleMetadata(spaceId),
  id,
  notebookId,
  spaceId,
  order: 0,
  sourceAssetId: `${id}-source`,
  thumbnailAssetId: `${id}-thumb`,
  width: 100,
  height: 200,
  rotation: 0,
  createdAt: 1,
  updatedAt: 1,
});

describe('useWriterNotebooks', () => {
  it('returns only notebooks in the requested space', async () => {
    await db.writerNotebooks.bulkPut([notebook('n1', 's1'), notebook('n2', 's2')]);
    const { result } = renderHook(() => useWriterNotebooks('s1'));
    await waitFor(() => { expect(result.current?.map(({ id }) => id)).toEqual(['n1']); });
  });

  it('pairs each notebook with its space-scoped page count', async () => {
    await db.writerNotebooks.put(notebook('n1', 's1'));
    await db.writerNotebookPages.bulkPut([page('p1', 'n1', 's1'), page('p2', 'n1', 's1')]);
    const { result } = renderHook(() => useWriterNotebookSummaries('s1'));
    await waitFor(() => { expect(result.current?.[0]?.pageCount).toBe(2); });
  });
});
