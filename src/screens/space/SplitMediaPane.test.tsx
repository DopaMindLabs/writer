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
  it('renders the reader for the item with a back-to-library affordance', async () => {
    await db.media.put(item);
    const onBack = vi.fn();
    renderWithProviders(
      <SplitMediaPane spaceId="s1" mediaId="m1" onBackToLibrary={onBack} />,
    );
    expect(await screen.findByTestId('split-media-pane')).toBeInTheDocument();
    expect(screen.getByText('thesis.pdf')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('split-media-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows the missing state with the back affordance when the item is gone', async () => {
    const onBack = vi.fn();
    renderWithProviders(
      <SplitMediaPane spaceId="s1" mediaId="gone" onBackToLibrary={onBack} />,
    );
    expect(await screen.findByTestId('split-media-missing')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('split-media-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
