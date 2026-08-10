import { act, renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import type { WriterNotebookPage } from '@/db/schema';
import { sampleMetadata } from '@/test/fixtures';
import { useNotebookPageActions } from './useNotebookPageActions';

const page = (id: string, order: number): WriterNotebookPage => ({
  ...sampleMetadata('s1'),
  id, notebookId: 'nb1', spaceId: 's1', order,
  sourceAssetId: `${id}-source`, thumbnailAssetId: `${id}-thumb`,
  width: 100, height: 200, rotation: 0, createdAt: 1, updatedAt: 1,
});

const seed = async (pages: readonly WriterNotebookPage[]): Promise<void> => {
  await db.writerNotebooks.put({
    ...sampleMetadata('s1'), id: 'nb1', spaceId: 's1', title: 'Notebook', createdAt: 1, updatedAt: 1,
  });
  await db.writerNotebookPages.bulkPut([...pages]);
};

describe('useNotebookPageActions', () => {
  it('navigates, rotates and chooses the nearest page after deletion', async () => {
    const pages = [page('p1', 0), page('p2', 1)];
    await seed(pages);
    const selectPage = vi.fn();
    const { result } = renderHook(() => useNotebookPageActions({
      spaceId: 's1', pages, selected: pages[0], selectPage,
    }));

    act(() => { result.current.next(); });
    expect(selectPage).toHaveBeenCalledWith('p2');
    act(() => { result.current.rotate(); });
    await waitFor(async () => { expect((await db.writerNotebookPages.get('p1'))?.rotation).toBe(90); });
    act(() => { result.current.deletePage(); });
    await waitFor(async () => { expect(await db.writerNotebookPages.get('p1')).toBeUndefined(); });
    expect(result.current.focusPageId).toBe('p2');
    expect(selectPage).toHaveBeenLastCalledWith('p2');
  });

  it('requests focus for the add-photo action after deleting the final page', async () => {
    const pages = [page('p1', 0)];
    await seed(pages);
    let currentPages: readonly WriterNotebookPage[] = pages;
    const { result, rerender } = renderHook(() => useNotebookPageActions({
      spaceId: 's1', pages: currentPages, selected: currentPages[0], selectPage: vi.fn(),
    }));

    act(() => { result.current.deletePage(); });
    await waitFor(async () => { expect(await db.writerNotebookPages.get('p1')).toBeUndefined(); });
    currentPages = [];
    rerender();
    await waitFor(() => { expect(result.current.focusAddAction).toBe(true); });
  });
});
