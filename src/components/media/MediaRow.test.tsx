// Mock only the pdfjs adapter seam so importing the media facade
// (deleteMediaCascade, via the row menu) does not pull real pdfjs into jsdom.
const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('@/lib/pdf/pdfAdapter', () => ({
  pdfjs: { getDocument, GlobalWorkerOptions: { workerSrc: '' } },
}));

import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { MediaRow } from './MediaRow';

const makeItem = (overrides: Partial<MediaItem> = {}): MediaItem => ({
  id: 'm1',
  spaceId: 's1',
  name: 'thesis.pdf',
  mime: PDF_MIME,
  size: 2 * 1024 * 1024,
  pageCount: 12,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  // Noon UTC keeps the date stable across the test runner's timezone.
  createdAt: Date.UTC(2024, 9, 24, 12, 0, 0),
  updatedAt: 1,
  ...overrides,
});

describe('MediaRow', () => {
  it('renders the name, pages, size, highlight count and added date', () => {
    renderWithProviders(
      <MediaRow item={makeItem()} highlightCount={3} onOpen={vi.fn()} />,
    );
    const row = screen.getByTestId('media-row-m1');
    expect(row).toHaveTextContent('thesis.pdf');
    expect(row).toHaveTextContent('12 pages');
    expect(row).toHaveTextContent('2.0 MB');
    expect(screen.getByTestId('media-row-highlights')).toHaveTextContent(
      '3 highlights',
    );
    expect(row).toHaveTextContent('24 OCT');
  });

  it('renders a muted dash when there are no highlights', () => {
    renderWithProviders(
      <MediaRow item={makeItem()} highlightCount={0} onOpen={vi.fn()} />,
    );
    const highlights = screen.getByTestId('media-row-highlights');
    expect(highlights).toHaveTextContent('—');
    expect(highlights).toHaveClass('text-ink-4');
  });

  it('opens the viewer when the row is clicked', async () => {
    const onOpen = vi.fn();
    const item = makeItem();
    renderWithProviders(<MediaRow item={item} highlightCount={0} onOpen={onOpen} />);
    await userEvent.click(screen.getByTestId('media-row-m1-open'));
    expect(onOpen).toHaveBeenCalledWith(item);
  });

  it('carries the media id as a drag payload for the canvas', () => {
    renderWithProviders(<MediaRow item={makeItem()} highlightCount={0} onOpen={vi.fn()} />);
    const setData = vi.fn();
    const dataTransfer = { setData, effectAllowed: '' };
    fireEvent.dragStart(screen.getByTestId('media-row-m1'), { dataTransfer });
    expect(setData).toHaveBeenCalledWith('application/x-lipsum-media-id', 'm1');
    expect(dataTransfer.effectAllowed).toBe('copy');
  });

  it('deletes via the cascade after confirmation from the row menu', async () => {
    const item = makeItem();
    await db.media.put(item);
    renderWithProviders(<MediaRow item={item} highlightCount={0} onOpen={vi.fn()} />);

    await userEvent.click(screen.getByTestId('media-row-m1-menu'));
    await userEvent.click(await screen.findByTestId('media-row-m1-menu-delete'));
    // The dialog is open but nothing is deleted until the user confirms.
    expect(await db.media.get('m1')).toBeDefined();

    await userEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(async () => {
      expect(await db.media.get('m1')).toBeUndefined();
    });
  });
});
