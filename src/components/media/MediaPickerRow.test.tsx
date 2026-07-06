import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { MediaPickerRow } from './MediaPickerRow';

const item: MediaItem = {
  id: 'm1',
  spaceId: 's1',
  name: 'thesis.pdf',
  mime: PDF_MIME,
  size: 2 * 1024 * 1024,
  pageCount: 12,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  createdAt: 1,
  updatedAt: 1,
};

const renderRow = (onChoose = vi.fn()) => {
  renderWithProviders(
    <ul>
      <MediaPickerRow item={item} onChoose={onChoose} />
    </ul>,
  );
  return onChoose;
};

describe('MediaPickerRow', () => {
  it('shows the name and page/size meta', () => {
    renderRow();
    expect(screen.getByText('thesis.pdf')).toBeInTheDocument();
    expect(screen.getByText(/12 pages/)).toBeInTheDocument();
  });

  it('reports the item id when chosen', async () => {
    const onChoose = renderRow();
    await userEvent.click(screen.getByTestId('media-picker-choose-m1'));
    expect(onChoose).toHaveBeenCalledWith('m1');
  });
});
