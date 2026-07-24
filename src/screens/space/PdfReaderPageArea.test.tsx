import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/pdf/pdfAdapter', async () => {
  const React = await import('react');
  return {
    pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
    Document: ({
      file,
      onLoadSuccess,
      children,
    }: {
      file: unknown;
      onLoadSuccess?: (pdf: { numPages: number }) => void;
      children: React.ReactNode;
    }) => {
      React.useEffect(() => {
        onLoadSuccess?.({ numPages: 1 });
      }, [file, onLoadSuccess]);
      return React.createElement('div', null, children);
    },
    Page: ({ pageNumber }: { pageNumber: number }) =>
      React.createElement('canvas', { 'data-testid': 'fake-page', 'data-page': pageNumber }),
  };
});

import { renderWithProviders, screen } from '@/test/test-utils';
import { db } from '@/db/db';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import type { PdfViewport } from '@/components/pdf/PdfViewer/usePdfViewport';
import { PdfReaderPageArea } from './PdfReaderPageArea';

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

const noop = (): void => undefined;
const viewWith = (numPages: number, scale = 1): PdfViewport => ({
  pageNumber: 1,
  numPages,
  scale,
  setNumPages: noop,
  prev: noop,
  next: noop,
  goToPage: noop,
  zoomOut: noop,
  zoomIn: noop,
  resetZoom: noop,
});

beforeEach(async () => {
  await db.pdfAnnotations.clear();
});

describe('PdfReaderPageArea', () => {
  it('renders the viewer with the pager and zoom cluster once paged', async () => {
    renderWithProviders(<PdfReaderPageArea spaceId="s1" item={item} view={viewWith(2)} />);
    expect(await screen.findByTestId('fake-page')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-pager')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-zoom')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-zoom-reset')).toHaveTextContent('100%');
  });

  it('shows the current scale in the zoom readout', async () => {
    renderWithProviders(<PdfReaderPageArea spaceId="s1" item={item} view={viewWith(2, 1.5)} />);
    await screen.findByTestId('fake-page');
    expect(screen.getByTestId('pdf-zoom-reset')).toHaveTextContent('150%');
  });

  it('hides the pager and zoom until the page count is known', async () => {
    renderWithProviders(<PdfReaderPageArea spaceId="s1" item={item} view={viewWith(0)} />);
    await screen.findByTestId('fake-page');
    expect(screen.queryByTestId('pdf-pager')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pdf-zoom')).not.toBeInTheDocument();
  });

  it('hides the centre pager when the thumbnail column owns navigation', async () => {
    renderWithProviders(
      <PdfReaderPageArea spaceId="s1" item={item} view={viewWith(2)} showPager={false} />,
    );
    await screen.findByTestId('fake-page');
    expect(screen.queryByTestId('pdf-pager')).not.toBeInTheDocument();
    // Zoom stays available even while the thumbnails drive paging.
    expect(screen.getByTestId('pdf-zoom')).toBeInTheDocument();
  });
});
