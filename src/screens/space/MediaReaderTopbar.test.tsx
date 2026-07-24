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
  it('keeps the shared topbar consistent: paper surface and mode tabs, with the focus and panel toggles in its right cluster', () => {
    renderWithProviders(
      <MediaReaderTopbar spaceId="s1" mediaId="m1" item={item} view={viewWith(9, 3)} />,
    );
    const topbar = screen.getByTestId('topbar');
    expect(topbar).toHaveClass('bg-paper');
    expect(topbar.querySelector('[data-tour="tour-topbar-modes"]')).not.toBeNull();
    // The focus and side-panel toggles sit in the topbar — the same right
    // cluster the doc screens use; the panel toggle drives the reader rail.
    expect(topbar.contains(screen.getByTestId('pdf-focus-toggle'))).toBe(true);
    expect(topbar.contains(screen.getByTestId('pdf-rail-toggle'))).toBe(true);
    // The left-hand reader affordances stay on the secondary toolbar.
    expect(topbar.contains(screen.getByTestId('media-viewer-back'))).toBe(false);
    expect(topbar.contains(screen.getByTestId('pdf-thumbs-toggle'))).toBe(false);
  });

  it('renders the secondary toolbar with the back link and thumbnail toggle under the topbar', () => {
    renderWithProviders(
      <MediaReaderTopbar spaceId="s1" mediaId="m1" item={item} view={viewWith(9, 3)} />,
    );
    const toolbar = screen.getByTestId('media-reader-toolbar');
    expect(toolbar.contains(screen.getByTestId('media-viewer-back'))).toBe(true);
    expect(toolbar.contains(screen.getByTestId('pdf-thumbs-toggle'))).toBe(true);
    expect(screen.getByTestId('topbar-crumb-suffix')).toHaveTextContent('· page 3 of 9');
  });

  it('keeps the focus toggle in the topbar but folds the panel toggle in focus mode', () => {
    renderWithProviders(
      <MediaReaderTopbar spaceId="s1" mediaId="m1" item={item} view={viewWith(9, 3)} />,
      { initialEntries: ['/?focus=1'] },
    );
    const topbar = screen.getByTestId('topbar');
    expect(topbar.contains(screen.getByTestId('pdf-focus-toggle'))).toBe(true);
    expect(screen.queryByTestId('pdf-rail-toggle')).not.toBeInTheDocument();
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
