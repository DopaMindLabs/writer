import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import type { MediaItem } from '@/db/schema';
import { MediaListRow } from './MediaListRow';

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

describe('MediaListRow', () => {
  it('fires select and delete callbacks', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    renderWithProviders(
      <MediaListRow item={item} active={false} onSelect={onSelect} onDelete={onDelete} />,
    );
    fireEvent.click(screen.getByTestId('media-row-m1-select'));
    fireEvent.click(screen.getByTestId('media-row-m1-delete'));
    expect(onSelect).toHaveBeenCalledWith('m1');
    expect(onDelete).toHaveBeenCalledWith('m1');
  });

  it('marks the active row with aria-current', () => {
    renderWithProviders(
      <MediaListRow item={item} active onSelect={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByTestId('media-row-m1-select')).toHaveAttribute(
      'aria-current',
      'true',
    );
  });
});
