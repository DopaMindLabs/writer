// Mock only the pdfjs adapter seam so importing the media facade
// (deleteMediaCascade) does not pull real pdfjs into jsdom.
const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('@/lib/pdf/pdfAdapter', () => ({
  pdfjs: { getDocument, GlobalWorkerOptions: { workerSrc: '' } },
}));

import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { MediaCard } from './MediaCard';

const makeItem = (overrides: Partial<MediaItem> = {}): MediaItem => ({
  id: 'm1',
  spaceId: 's1',
  name: 'thesis.pdf',
  mime: PDF_MIME,
  size: 2 * 1024 * 1024,
  pageCount: 12,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

describe('MediaCard', () => {
  it('renders name, page count and size', () => {
    renderWithProviders(<MediaCard item={makeItem()} onOpen={vi.fn()} />);
    expect(screen.getByTestId('media-card-m1-name')).toHaveTextContent(
      'thesis.pdf',
    );
    const meta = screen.getByTestId('media-card-m1-meta');
    expect(meta).toHaveTextContent('12 pages');
    expect(meta).toHaveTextContent('2.0 MB');
  });

  it('renders a singular page label for a one-page pdf', () => {
    renderWithProviders(
      <MediaCard item={makeItem({ pageCount: 1 })} onOpen={vi.fn()} />,
    );
    expect(screen.getByTestId('media-card-m1-meta')).toHaveTextContent('1 page');
  });

  it('exposes an accessible open action', async () => {
    const onOpen = vi.fn();
    const item = makeItem();
    renderWithProviders(<MediaCard item={item} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: /open/i }));
    expect(onOpen).toHaveBeenCalledWith(item);
  });

  it('confirms before deleting via the cascade', async () => {
    const item = makeItem();
    await db.media.put(item);
    renderWithProviders(<MediaCard item={item} onOpen={vi.fn()} />);

    await userEvent.click(screen.getByTestId('media-card-m1-delete'));
    // The dialog is open but nothing is deleted until the user confirms.
    expect(await db.media.get('m1')).toBeDefined();

    await userEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(async () => {
      expect(await db.media.get('m1')).toBeUndefined();
    });
  });
});
