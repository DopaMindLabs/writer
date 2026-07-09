import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

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
import { useUI, type PdfReaderPref } from '@/store/ui';
import type { MediaItem } from '@/db/schema';
import type { PdfViewport } from '@/components/pdf/PdfViewer/usePdfViewport';
import { PdfReaderSurface } from './PdfReaderSurface';

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
const viewWith = (numPages: number): PdfViewport => ({
  pageNumber: 1,
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

const setPref = (pref: Partial<PdfReaderPref>) => {
  act(() => {
    useUI.setState({
      pdfReaderPrefs: { m1: { railHidden: false, panel: null, thumbs: false, ...pref } },
    });
  });
};

beforeEach(async () => {
  await db.pdfAnnotations.clear();
  act(() => {
    useUI.setState({ pdfReaderPrefs: {} });
  });
});

describe('PdfReaderSurface', () => {
  it('renders the viewer, the pager and the rail by default', async () => {
    renderWithProviders(<PdfReaderSurface spaceId="s1" item={item} view={viewWith(2)} />);
    expect(await screen.findByTestId('fake-page')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-pager')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-reader-rail')).toBeInTheDocument();
    // No panel is open by default.
    expect(screen.queryByTestId('pdf-reader-panel')).not.toBeInTheDocument();
  });

  it('hides the pager until the page count is known', async () => {
    renderWithProviders(<PdfReaderSurface spaceId="s1" item={item} view={viewWith(0)} />);
    await screen.findByTestId('fake-page');
    expect(screen.queryByTestId('pdf-pager')).not.toBeInTheDocument();
  });

  it('opens the highlights panel when the pref says so', async () => {
    setPref({ panel: 'highlights' });
    renderWithProviders(<PdfReaderSurface spaceId="s1" item={item} view={viewWith(2)} />);
    await screen.findByTestId('fake-page');
    expect(screen.getByTestId('pdf-reader-panel')).toHaveTextContent('Highlights & notes');
  });

  it('hides the rail and any panel when railHidden is set', async () => {
    setPref({ railHidden: true, panel: 'info' });
    renderWithProviders(<PdfReaderSurface spaceId="s1" item={item} view={viewWith(2)} />);
    await screen.findByTestId('fake-page');
    expect(screen.queryByTestId('pdf-reader-rail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pdf-reader-panel')).not.toBeInTheDocument();
  });

  it('keeps the thumbnail column hidden by default', async () => {
    renderWithProviders(<PdfReaderSurface spaceId="s1" item={item} view={viewWith(2)} />);
    await screen.findByTestId('fake-page');
    expect(screen.queryByTestId('pdf-thumb-rail')).not.toBeInTheDocument();
  });

  it('shows the thumbnail column and hides the centre pager when thumbs are open', async () => {
    setPref({ thumbs: true });
    renderWithProviders(<PdfReaderSurface spaceId="s1" item={item} view={viewWith(2)} />);
    await screen.findByTestId('fake-page');
    expect(screen.getByTestId('pdf-thumb-rail')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-pager')).not.toBeInTheDocument();
    // The column keeps its own docked foot pager.
    expect(screen.getByTestId('pdf-thumb-pager')).toBeInTheDocument();
  });
});
