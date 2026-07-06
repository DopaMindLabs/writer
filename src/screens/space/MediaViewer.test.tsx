import { describe, it, expect, vi } from 'vitest';

// Mock only the adapter seam: a fake Document that loads immediately and a fake
// Page standing in for the canvas, so the real PdfViewer renders in jsdom.
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
      return React.createElement('div', { 'data-testid': 'fake-document' }, children);
    },
    Page: ({ pageNumber }: { pageNumber: number }) =>
      React.createElement('canvas', { 'data-testid': 'fake-page', 'data-page': pageNumber }),
  };
});

import { renderAtRoute, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { PDF_MIME } from '@/data/media';
import { sampleSpace } from '@/test/fixtures';
import type { MediaItem } from '@/db/schema';
import { MediaViewerScreen } from './MediaViewer';

const sampleMedia: MediaItem = {
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

const renderViewer = (mediaId: string) =>
  renderAtRoute(<MediaViewerScreen />, {
    path: '/s/:spaceId/library/:mediaId',
    initialEntries: [`/s/s1/library/${mediaId}`],
  });

describe('MediaViewerScreen', () => {
  it('renders the viewer for a library item', async () => {
    await db.spaces.put(sampleSpace);
    await db.media.put(sampleMedia);
    renderViewer('m1');
    expect(await screen.findByTestId('fake-page')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-viewer')).toHaveAttribute('aria-label', 'thesis.pdf');
  });

  it('offers a back link to the library', async () => {
    await db.spaces.put(sampleSpace);
    await db.media.put(sampleMedia);
    renderViewer('m1');
    const back = await screen.findByTestId('media-viewer-back');
    expect(back).toHaveAttribute('href', '/s/s1/library');
  });

  it('shows the missing state for an unknown id', async () => {
    await db.spaces.put(sampleSpace);
    renderViewer('does-not-exist');
    await waitFor(() => {
      expect(screen.getByTestId('media-viewer-missing')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('pdf-viewer')).not.toBeInTheDocument();
  });

  it('redirects home when a route param is missing', () => {
    const { queryByTestId } = renderAtRoute(<MediaViewerScreen />, {
      path: '/library',
      initialEntries: ['/library'],
    });
    expect(queryByTestId('catch-all')).toBeInTheDocument();
  });
});
