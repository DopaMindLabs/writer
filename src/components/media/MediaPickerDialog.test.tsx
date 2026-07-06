// Mock only the pdfjs adapter seam so the upload path's page count runs without
// real pdf.js in jsdom.
const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('@/lib/pdf/pdfAdapter', () => ({
  pdfjs: { getDocument, GlobalWorkerOptions: { workerSrc: '' } },
}));

import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { MediaPickerDialog } from './MediaPickerDialog';

const makeMedia = (overrides: Partial<MediaItem>): MediaItem => ({
  id: 'm',
  spaceId: 's1',
  name: 'doc.pdf',
  mime: PDF_MIME,
  size: 1024,
  pageCount: 1,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const pdfFile = (name = 'new.pdf'): File =>
  new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3])], name, { type: PDF_MIME });

const renderPicker = (
  props: Partial<React.ComponentProps<typeof MediaPickerDialog>> = {},
) =>
  renderWithProviders(
    <MediaPickerDialog
      spaceId="s1"
      open
      onOpenChange={props.onOpenChange ?? vi.fn()}
      onSelect={props.onSelect ?? vi.fn()}
    />,
  );

beforeEach(() => {
  getDocument.mockReset();
  getDocument.mockReturnValue({
    promise: Promise.resolve({ numPages: 3 }),
    destroy: vi.fn().mockResolvedValue(undefined),
  });
});

describe('MediaPickerDialog', () => {
  it('lists library items and reports the chosen id', async () => {
    await db.media.put(makeMedia({ id: 'm1', name: 'chosen.pdf' }));
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    renderPicker({ onSelect, onOpenChange });

    await userEvent.click(await screen.findByTestId('media-picker-choose-m1'));

    expect(onSelect).toHaveBeenCalledWith('m1');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('uploading inside the picker selects the new item', async () => {
    const onSelect = vi.fn();
    renderPicker({ onSelect });

    await userEvent.upload(screen.getByTestId('media-upload-input'), pdfFile());

    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    const added = await db.media.toArray();
    expect(added).toHaveLength(1);
    expect(onSelect).toHaveBeenCalledWith(added[0].id);
  });

  it('escape closes without selecting', async () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    renderPicker({ onSelect, onOpenChange });
    await screen.findByTestId('media-picker');

    await userEvent.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
