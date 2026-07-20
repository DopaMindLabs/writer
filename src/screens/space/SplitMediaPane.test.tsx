import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { db } from '@/db/db';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';

// The reader surface pulls the pdf.js engine transitively; mock the adapter
// seam so jsdom never loads it (same seam Split.test.tsx mocks).
const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('@/lib/pdf/pdfAdapter', () => ({
  pdfjs: { getDocument, GlobalWorkerOptions: { workerSrc: '' } },
  Document: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="pdf-doc-stub">{children}</div>
  ),
  Page: () => <div data-testid="pdf-page-stub" />,
}));

const { SplitMediaPane } = await import('./SplitMediaPane');

const item: MediaItem = {
  id: 'm1',
  spaceId: 's1',
  name: 'thesis.pdf',
  mime: PDF_MIME,
  size: 2048,
  pageCount: 1,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  createdAt: 1,
  updatedAt: 1,
};

beforeEach(async () => {
  await db.media.clear();
});

describe('SplitMediaPane', () => {
  it('renders the reader under the same grey toolbar as the full reader', async () => {
    await db.media.put(item);
    const onBack = vi.fn();
    renderWithProviders(
      <SplitMediaPane spaceId="s1" mediaId="m1" onBackToLibrary={onBack} />,
    );
    expect(await screen.findByTestId('split-media-pane')).toBeInTheDocument();
    // The pane's bar is the reader toolbar: icon back + the thumbnail toggle.
    expect(screen.getByTestId('media-reader-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-thumbs-toggle')).toBeInTheDocument();
    // Back swaps the pane instead of navigating to the library route.
    await userEvent.click(screen.getByTestId('media-viewer-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows the missing state with the back affordance when the item is gone', async () => {
    const onBack = vi.fn();
    renderWithProviders(
      <SplitMediaPane spaceId="s1" mediaId="gone" onBackToLibrary={onBack} />,
    );
    expect(await screen.findByTestId('split-media-missing')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-thumbs-toggle')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('media-viewer-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
