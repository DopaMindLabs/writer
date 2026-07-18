import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { PDF_MIME } from '@/data/media';
import { useUI } from '@/store/ui';
import type { MediaItem } from '@/db/schema';
import type { PdfViewport } from '@/components/pdf/PdfViewer/usePdfViewport';
import { MediaReaderTopbar } from './MediaReaderTopbar';

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
const viewWith = (numPages: number, pageNumber = 1): PdfViewport => ({
  pageNumber,
  numPages,
  scale: 1,
  setNumPages: noop,
  prev: noop,
  next: noop,
  goToPage: noop,
  zoomOut: noop,
  zoomIn: noop,
  resetZoom: noop,
});

beforeEach(() => {
  act(() => {
    useUI.setState({ pdfReaderPrefs: {} });
  });
});

describe('MediaReaderTopbar', () => {
  it('keeps the shared topbar untouched: paper surface, mode tabs, no reader controls inside', () => {
    renderWithProviders(
      <MediaReaderTopbar spaceId="s1" mediaId="m1" item={item} view={viewWith(9, 3)} />,
    );
    const topbar = screen.getByTestId('topbar');
    // The shared bar renders exactly as on the doc screens — paper, with the
    // Write/Focus/Read/Split tabs group in place.
    expect(topbar).toHaveClass('bg-paper');
    expect(topbar.querySelector('[data-tour="tour-topbar-modes"]')).not.toBeNull();
    // Every reader control lives on the secondary toolbar, not in the topbar.
    expect(topbar.contains(screen.getByTestId('media-viewer-back'))).toBe(false);
    expect(topbar.contains(screen.getByTestId('pdf-thumbs-toggle'))).toBe(false);
    expect(topbar.contains(screen.getByTestId('pdf-rail-toggle'))).toBe(false);
    expect(topbar.contains(screen.getByTestId('pdf-focus-toggle'))).toBe(false);
  });

  it('renders the secondary toolbar with the reader controls under the topbar', () => {
    renderWithProviders(
      <MediaReaderTopbar spaceId="s1" mediaId="m1" item={item} view={viewWith(9, 3)} />,
    );
    const toolbar = screen.getByTestId('media-reader-toolbar');
    expect(toolbar.contains(screen.getByTestId('media-viewer-back'))).toBe(true);
    expect(toolbar.contains(screen.getByTestId('pdf-thumbs-toggle'))).toBe(true);
    expect(toolbar.contains(screen.getByTestId('pdf-rail-toggle'))).toBe(true);
    expect(toolbar.contains(screen.getByTestId('pdf-focus-toggle'))).toBe(true);
    expect(screen.getByTestId('topbar-crumb-suffix')).toHaveTextContent('· page 3 of 9');
  });

  it('keeps the back link but omits the reader toggles while the item is loading', () => {
    renderWithProviders(
      <MediaReaderTopbar spaceId="s1" mediaId="m1" item={undefined} view={viewWith(0)} />,
    );
    expect(screen.getByTestId('media-viewer-back')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-thumbs-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pdf-rail-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pdf-focus-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('topbar-crumb-suffix')).not.toBeInTheDocument();
  });

  it('omits the page readout until the page count is known', () => {
    renderWithProviders(
      <MediaReaderTopbar spaceId="s1" mediaId="m1" item={item} view={viewWith(0)} />,
    );
    expect(screen.queryByTestId('topbar-crumb-suffix')).not.toBeInTheDocument();
  });
});
