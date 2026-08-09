import { act, renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { sampleMetadata } from '@/test/fixtures';

const { processPageImageMock } = vi.hoisted(() => ({ processPageImageMock: vi.fn() }));
vi.mock('writer-notebook/browser', () => ({
  processPageImage: processPageImageMock,
}));

import { useNotebookPageImport } from './useNotebookPageImport';

const processed = (label: string) => ({
  source: {
    blob: new Blob([`source-${label}`], { type: 'image/webp' }),
    mime: 'image/webp',
    width: 100,
    height: 200,
  },
  thumbnail: {
    blob: new Blob([`thumb-${label}`], { type: 'image/webp' }),
    mime: 'image/webp',
    width: 50,
    height: 100,
  },
});

describe('useNotebookPageImport', () => {
  it('processes selected photos sequentially and preserves their order', async () => {
    await db.writerNotebooks.put({
      ...sampleMetadata('s1'),
      id: 'nb1', spaceId: 's1', title: 'Notebook', createdAt: 1, updatedAt: 1,
    });
    processPageImageMock
      .mockResolvedValueOnce(processed('a'))
      .mockResolvedValueOnce(processed('b'));
    const { result } = renderHook(() => useNotebookPageImport('s1', 'nb1'));

    act(() => {
      result.current.importFiles([
        new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
        new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
      ]);
    });

    await waitFor(() => { expect(result.current.processing).toBe(false); });
    const pages = await db.writerNotebookPages.where('notebookId').equals('nb1').sortBy('order');
    expect(pages.map(({ order }) => order)).toEqual([0, 1]);
    expect(processPageImageMock).toHaveBeenCalledTimes(2);
  });
});
