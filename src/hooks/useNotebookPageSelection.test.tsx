import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { NotebookPage } from 'writer-notebook/core';
import { AllProviders } from '@/test/test-utils';
import { useNotebookPageSelection } from './useNotebookPageSelection';

const page = (id: string, order: number): NotebookPage => ({
  id,
  notebookId: 'nb1',
  order,
  sourceAssetId: `${id}-source`,
  thumbnailAssetId: `${id}-thumb`,
  width: 100,
  height: 200,
  rotation: 0,
  createdAt: 1,
  updatedAt: 1,
});

describe('useNotebookPageSelection', () => {
  it('falls back to the first page and keeps explicit page changes addressable', async () => {
    const pages = [page('p1', 0), page('p2', 1)];
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AllProviders initialEntries={['/s/s1/notebooks/nb1?page=missing']}>{children}</AllProviders>
    );
    const { result } = renderHook(() => useNotebookPageSelection(pages), { wrapper });
    await waitFor(() => { expect(result.current.selected?.id).toBe('p1'); });
    act(() => { result.current.selectPage('p2'); });
    await waitFor(() => { expect(result.current.selected?.id).toBe('p2'); });
  });
});
