import { describe, it, expect, vi } from 'vitest';

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
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import type { PdfViewport } from '@/components/pdf/PdfViewer/usePdfViewport';
import { MediaViewerContent } from './MediaViewerContent';

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
const stubView: PdfViewport = {
  pageNumber: 1,
  numPages: 0,
  scale: 1,
  setNumPages: noop,
  prev: noop,
  next: noop,
  goToPage: noop,
  zoomOut: noop,
  zoomIn: noop,
  resetZoom: noop,
};

describe('MediaViewerContent', () => {
  it('always offers a back link to the library', () => {
    renderWithProviders(
      <MediaViewerContent spaceId="s1" item={undefined} view={stubView} />,
    );
    expect(screen.getByTestId('media-viewer-back')).toHaveAttribute('href', '/s/s1/library');
  });

  it('shows nothing but the back link while loading', () => {
    renderWithProviders(
      <MediaViewerContent spaceId="s1" item={undefined} view={stubView} />,
    );
    expect(screen.queryByTestId('media-viewer-missing')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pdf-viewer')).not.toBeInTheDocument();
  });

  it('shows the missing state when the item is gone', () => {
    renderWithProviders(
      <MediaViewerContent spaceId="s1" item={null} view={stubView} />,
    );
    expect(screen.getByTestId('media-viewer-missing')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-viewer')).not.toBeInTheDocument();
  });

  it('renders the reader surface for a present item', async () => {
    renderWithProviders(
      <MediaViewerContent spaceId="s1" item={item} view={stubView} />,
    );
    expect(await screen.findByTestId('fake-page')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-viewer')).toHaveAttribute('aria-label', 'thesis.pdf');
    // The rail is shown by default (railHidden=false).
    expect(screen.getByTestId('pdf-reader-rail')).toBeInTheDocument();
  });
});
