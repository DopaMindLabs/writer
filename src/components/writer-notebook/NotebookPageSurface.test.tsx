import { sampleMetadata } from '@/test/fixtures';
import { render, screen } from '@/test/test-utils';
import { NotebookPageSurface } from './NotebookPageSurface';

const metadata = sampleMetadata('s1');
const page = {
  ...metadata,
  id: 'p1', notebookId: 'nb1', spaceId: 's1', order: 0,
  sourceAssetId: 'source', thumbnailAssetId: 'thumb', width: 100, height: 200,
  rotation: 0 as const, createdAt: 1, updatedAt: 1,
};

describe('NotebookPageSurface', () => {
  it('shows the notebook empty state before the first page is added', () => {
    render(
      <NotebookPageSurface
        pages={[]}
        assets={[]}
        selected={undefined}
        source={undefined}
        vector={undefined}
        pageIndex={-1}
        focusPageId={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('No pages yet')).toBeInTheDocument();
  });

  it('reports a stored page whose source image is unavailable', () => {
    render(
      <NotebookPageSurface
        pages={[page]}
        assets={[]}
        selected={page}
        source={undefined}
        vector={undefined}
        pageIndex={0}
        focusPageId={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('This notebook page image is unavailable.')).toBeInTheDocument();
  });
});
