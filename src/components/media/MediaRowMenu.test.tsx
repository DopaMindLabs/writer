// Mock only the pdfjs adapter seam so importing the media facade
// (deleteMediaCascade) does not pull real pdfjs into jsdom.
const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('@/lib/pdf/pdfAdapter', () => ({
  pdfjs: { getDocument, GlobalWorkerOptions: { workerSrc: '' } },
}));

import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { MediaRowMenu } from './MediaRowMenu';

const item: MediaItem = {
  id: 'm1',
  spaceId: 's1',
  name: 'thesis.pdf',
  mime: PDF_MIME,
  size: 1024,
  pageCount: 3,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  createdAt: 1,
  updatedAt: 1,
};

describe('MediaRowMenu', () => {
  it('opens the viewer from the Open item', async () => {
    const onOpen = vi.fn();
    renderWithProviders(<MediaRowMenu item={item} onOpen={onOpen} />);
    await userEvent.click(screen.getByTestId('media-row-m1-menu'));
    await userEvent.click(await screen.findByTestId('media-row-m1-menu-open'));
    expect(onOpen).toHaveBeenCalledWith(item);
  });

  it('opens the delete confirmation from the Delete item', async () => {
    renderWithProviders(<MediaRowMenu item={item} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByTestId('media-row-m1-menu'));
    await userEvent.click(await screen.findByTestId('media-row-m1-menu-delete'));
    expect(await screen.findByTestId('confirm-dialog')).toBeInTheDocument();
  });
});
