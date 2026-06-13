import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { db } from '@/db/db';
import type { MediaItem } from '@/db/schema';
import { MediaPickerLibraryTab } from './MediaPickerLibraryTab';

const item = (overrides: Partial<MediaItem>): MediaItem => ({
  id: 'm1',
  spaceId: 's1',
  name: 'paper.pdf',
  mime: 'application/pdf',
  size: 1,
  blob: new Blob(['%PDF']),
  pageCount: 8,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

describe('MediaPickerLibraryTab', () => {
  it('shows an empty state when the space has no media', async () => {
    renderWithProviders(<MediaPickerLibraryTab spaceId="s1" onSelect={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId('media-picker-library-empty')).toBeInTheDocument();
    });
  });

  it('lists media and selects the chosen item', async () => {
    await db.media.bulkPut([
      item({ id: 'a', name: 'a.pdf' }),
      item({ id: 'b', name: 'b.pdf' }),
    ]);
    const onSelect = vi.fn();
    renderWithProviders(<MediaPickerLibraryTab spaceId="s1" onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId('media-picker-row-a')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('media-picker-row-b'));
    expect(onSelect).toHaveBeenCalledWith('b');
  });
});
