import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import type { WriterNotebook, WriterNotebookAsset, WriterNotebookPage } from '@/db/schema';
import { sampleMetadata } from '@/test/fixtures';
import { useWriterNotebookAssets, useWriterNotebookPages } from './useWriterNotebookPages';

const notebook: WriterNotebook = {
  ...sampleMetadata('s1'), id: 'n1', spaceId: 's1', title: 'Field notebook', createdAt: 1, updatedAt: 1,
};
const page = (id: string, order: number, spaceId = 's1'): WriterNotebookPage => ({
  ...sampleMetadata(spaceId), id, notebookId: 'n1', spaceId, order,
  sourceAssetId: `${id}-source`, thumbnailAssetId: `${id}-thumb`, width: 100, height: 200,
  rotation: 0, createdAt: 1, updatedAt: 1,
});

describe('notebook page hooks', () => {
  it('sorts pages by order then id and rejects foreign-space rows', async () => {
    await db.writerNotebooks.put(notebook);
    await db.writerNotebookPages.bulkPut([
      page('p2', 0), page('p1', 0), page('foreign', 0, 's2'),
    ]);
    const { result } = renderHook(() => useWriterNotebookPages('s1', 'n1'));
    await waitFor(() => { expect(result.current?.map(({ id }) => id)).toEqual(['p1', 'p2']); });
  });

  it('returns only assets owned by the active notebook and space', async () => {
    await db.writerNotebooks.put(notebook);
    const asset = (id: string, spaceId: string): WriterNotebookAsset => ({
      ...sampleMetadata(spaceId), id, notebookId: 'n1', pageId: 'p1', spaceId,
      kind: 'source', mime: 'image/webp', size: 1,
      blob: new Blob(['x'], { type: 'image/webp' }), createdAt: 1,
    });
    await db.writerNotebookAssets.bulkPut([asset('a1', 's1'), asset('a2', 's2')]);
    const { result } = renderHook(() => useWriterNotebookAssets('s1', 'n1'));
    await waitFor(() => { expect(result.current?.map(({ id }) => id)).toEqual(['a1']); });
  });
});
