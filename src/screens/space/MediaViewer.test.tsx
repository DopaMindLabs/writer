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

import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAtRoute, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { PDF_MIME } from '@/data/media';
import { sampleSpace } from '@/test/fixtures';
import { useUI } from '@/store/ui';
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
  beforeEach(() => {
    act(() => {
      useUI.setState({ pdfReaderPrefs: {} });
    });
  });

  it('renders the viewer for a library item', async () => {
    await db.spaces.put(sampleSpace);
    await db.media.put(sampleMedia);
    renderViewer('m1');
    expect(await screen.findByTestId('fake-page')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-viewer')).toHaveAttribute('aria-label', 'thesis.pdf');
  });

  it('collapses the space sidebar so the page owns the room', async () => {
    await db.spaces.put(sampleSpace);
    await db.media.put(sampleMedia);
    renderViewer('m1');
    await screen.findByTestId('fake-page');
    // The space sidebar is gone (design Frame C); only the SpaceRail remains.
    expect(screen.queryByTestId('sidebar-space-menu-trigger')).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Spaces' })).toBeInTheDocument();
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

  it('mounts the quiet pager and the reader rail once the document loads', async () => {
    await db.spaces.put(sampleSpace);
    await db.media.put(sampleMedia);
    renderViewer('m1');
    await screen.findByTestId('fake-page');
    expect(screen.getByTestId('pdf-pager')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-reader-rail')).toBeInTheDocument();
    // The lifted page state also feeds the crumb.
    expect(screen.getByTestId('topbar-crumb-suffix')).toHaveTextContent('· page 1 of 1');
  });

  it('opens a side panel from a rail glyph', async () => {
    await db.spaces.put(sampleSpace);
    await db.media.put(sampleMedia);
    renderViewer('m1');
    await screen.findByTestId('fake-page');
    await userEvent.click(screen.getByTestId('pdf-rail-highlights'));
    expect(screen.getByTestId('pdf-reader-panel')).toHaveTextContent('Highlights & notes');
    expect(screen.getByTestId('pdf-rail-highlights')).toHaveAttribute('aria-pressed', 'true');
  });

  it('hides the rail from the topbar toggle and remembers it per document', async () => {
    await db.spaces.put(sampleSpace);
    await db.media.put(sampleMedia);
    renderViewer('m1');
    await screen.findByTestId('fake-page');
    await userEvent.click(screen.getByTestId('pdf-rail-toggle'));
    expect(screen.queryByTestId('pdf-reader-rail')).not.toBeInTheDocument();
    expect(useUI.getState().pdfReaderPrefs.m1.railHidden).toBe(true);
  });
});
