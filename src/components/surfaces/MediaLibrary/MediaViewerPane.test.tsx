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

  it('renders the viewer with its own toolbar (no duplicate title)', () => {
    renderWithProviders(<MediaViewerPane item={item} />);
    expect(screen.getByTestId('media-viewer')).toBeInTheDocument();
    // The single title comes from the PdfViewer toolbar, not a separate meta.
    expect(screen.queryByTestId('media-viewer-meta')).not.toBeInTheDocument();
    expect(screen.getByTestId('pdf-viewer-summary')).toHaveTextContent(
      'paper.pdf',
    );
  });
});
