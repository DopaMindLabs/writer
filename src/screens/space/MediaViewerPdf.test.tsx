import { describe, it, expect, vi, beforeEach } from 'vitest';

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
import type { PdfAnnotation } from '@/db/schema';
import { MediaViewerPdf } from './MediaViewerPdf';

const highlight: PdfAnnotation = {
  id: 'h1',
  mediaId: 'm1',
  spaceId: 's1',
  kind: 'highlight',
  page: 1,
  rects: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.05 }],
  quote: 'a highlighted sentence',
  color: 'yellow',
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
};

beforeEach(async () => {
  await db.pdfAnnotations.clear();
});

const blob = new Blob(['%PDF'], { type: PDF_MIME });

describe('MediaViewerPdf', () => {
  it('renders the viewer with the annotation overlay', async () => {
    renderWithProviders(
      <MediaViewerPdf mediaId="m1" spaceId="s1" blob={blob} title="thesis.pdf" />,
    );
    expect(await screen.findByTestId('fake-page')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-highlight-layer')).toBeInTheDocument();
  });

  it("projects the media's existing highlights onto the page", async () => {
    await db.pdfAnnotations.add(highlight);
    renderWithProviders(
      <MediaViewerPdf mediaId="m1" spaceId="s1" blob={blob} title="thesis.pdf" />,
    );
    const mark = await screen.findByTestId('pdf-highlight-mark');
    expect(mark).toHaveAttribute('data-kind', 'highlight');
    expect(mark).toHaveAccessibleName('Highlight, Yellow: a highlighted sentence');
  });
});
