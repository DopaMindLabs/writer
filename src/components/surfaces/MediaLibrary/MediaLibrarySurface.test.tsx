import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { db } from '@/db/db';
import type { MediaItem } from '@/db/schema';
import { MediaLibrarySurface } from './MediaLibrarySurface';

const item = (id: string, name: string, createdAt: number): MediaItem => ({
  id,
  spaceId: 's1',
  name,
  mime: 'application/pdf',
  size: 1,
  blob: new Blob(['%PDF']),
  pageCount: 2,
  createdAt,
  updatedAt: createdAt,
});

describe('MediaLibrarySurface', () => {
  it('shows the empty state for a space with no media', async () => {
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    await waitFor(() => {
      expect(screen.getByTestId('media-empty')).toBeInTheDocument();
    });
  });

  it('lists media, previews a selection, filters, and deletes', async () => {
    await db.media.bulkPut([
      item('a', 'attention.pdf', 100),
      item('b', 'transformers.pdf', 200),
    ]);
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);

    await waitFor(() => {
      expect(screen.getByTestId('media-row-a')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('media-row-a-select'));
    expect(screen.getByTestId('media-viewer-meta')).toHaveTextContent(
      'attention.pdf',
    );

    fireEvent.change(screen.getByTestId('media-search'), {
      target: { value: 'transform' },
    });
    expect(screen.queryByTestId('media-row-a')).not.toBeInTheDocument();
    expect(screen.getByTestId('media-row-b')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('media-search'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByTestId('media-row-a-delete'));
    await waitFor(() => {
      expect(screen.queryByTestId('media-row-a')).not.toBeInTheDocument();
    });
    expect(await db.media.get('a')).toBeUndefined();
  });
});
