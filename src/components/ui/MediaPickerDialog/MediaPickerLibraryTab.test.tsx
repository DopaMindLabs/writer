import { vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { db } from '@/db/db';
import type { MediaItem } from '@/db/schema';
import { MediaPickerLibraryTab } from './MediaPickerLibraryTab';

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({ numPages: 3 }),
    destroy: () => Promise.resolve(),
  })),
}));

const pickPdf = (name: string) => {
  const input = document.querySelector<HTMLInputElement>(
    'input[data-testid="media-upload-input"]',
  );
  if (!input) throw new Error('upload input not found');
  const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], name, {
    type: 'application/pdf',
  });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
};

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

  it('uploads a PDF and auto-selects it', async () => {
    const onSelect = vi.fn();
    renderWithProviders(<MediaPickerLibraryTab spaceId="s1" onSelect={onSelect} />);

    pickPdf('uploaded.pdf');

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
    const id = onSelect.mock.calls[0]?.[0] as string;
    expect((await db.media.get(id))?.name).toBe('uploaded.pdf');
  });
});
