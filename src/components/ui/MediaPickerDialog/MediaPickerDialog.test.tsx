import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { db } from '@/db/db';
import { MediaPickerDialog } from './MediaPickerDialog';

describe('MediaPickerDialog', () => {
  it('selects a library item and closes', async () => {
    await db.media.put({
      id: 'm1',
      spaceId: 's1',
      name: 'paper.pdf',
      mime: 'application/pdf',
      size: 1,
      blob: new Blob(['%PDF']),
      pageCount: 3,
      createdAt: 1,
      updatedAt: 1,
    });
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    renderWithProviders(
      <MediaPickerDialog
        open
        onOpenChange={onOpenChange}
        spaceId="s1"
        onSelect={onSelect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('media-picker-row-m1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('media-picker-row-m1'));

    expect(onSelect).toHaveBeenCalledWith({ kind: 'library', mediaItemId: 'm1' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('switches to the URL tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MediaPickerDialog
        open
        onOpenChange={vi.fn()}
        spaceId="s1"
        onSelect={vi.fn()}
      />,
    );
    await user.click(screen.getByTestId('media-picker-tab-url'));
    await waitFor(() => {
      expect(screen.getByTestId('media-picker-url-field')).toBeInTheDocument();
    });
  });
});
