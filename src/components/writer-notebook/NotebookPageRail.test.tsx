import userEvent from '@testing-library/user-event';
import { sampleMetadata } from '@/test/fixtures';
import { render, screen } from '@/test/test-utils';
import { NotebookPageRail } from './NotebookPageRail';

const metadata = sampleMetadata('s1');
const page = {
  ...metadata,
  id: 'p1', notebookId: 'nb1', spaceId: 's1', order: 0,
  sourceAssetId: 'source', thumbnailAssetId: 'thumb', width: 100, height: 200,
  rotation: 0 as const, createdAt: 1, updatedAt: 1,
};
const asset = {
  ...metadata,
  id: 'thumb', notebookId: 'nb1', pageId: 'p1', spaceId: 's1', kind: 'thumbnail' as const,
  mime: 'image/webp', size: 1, blob: new Blob(['x'], { type: 'image/webp' }), createdAt: 1,
};

describe('NotebookPageRail', () => {
  it('labels the page navigation and selects a thumbnail by page id', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <NotebookPageRail
        pages={[page]}
        assets={[asset]}
        selectedPageId="p1"
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Notebook pages' })).toBeInTheDocument();
    const thumbnail = screen.getByRole('button', { name: 'Page 1' });
    expect(thumbnail).toHaveAttribute('aria-current', 'page');
    await user.click(thumbnail);
    expect(onSelect).toHaveBeenCalledWith('p1');
  });

  it('does not render a page whose thumbnail asset is unavailable', () => {
    render(
      <NotebookPageRail pages={[page]} assets={[]} selectedPageId={null} onSelect={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: 'Page 1' })).not.toBeInTheDocument();
  });
});
