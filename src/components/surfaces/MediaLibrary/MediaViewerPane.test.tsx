import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import type { MediaItem } from '@/db/schema';
import { MediaViewerPane } from './MediaViewerPane';

const item: MediaItem = {
  id: 'm1',
  spaceId: 's1',
  name: 'paper.pdf',
  mime: 'application/pdf',
  size: 1,
  blob: new Blob(['%PDF']),
  pageCount: 8,
  createdAt: 0,
  updatedAt: 0,
};

describe('MediaViewerPane', () => {
  it('prompts to select when nothing is chosen', () => {
    renderWithProviders(<MediaViewerPane item={null} />);
    expect(screen.getByTestId('media-viewer-empty')).toBeInTheDocument();
  });

  it('renders the selected item meta and viewer', () => {
    renderWithProviders(<MediaViewerPane item={item} />);
    const meta = screen.getByTestId('media-viewer-meta');
    expect(meta).toHaveTextContent('paper.pdf');
    expect(meta).toHaveTextContent('8 pages');
    expect(screen.getByTestId('media-viewer')).toBeInTheDocument();
  });
});
