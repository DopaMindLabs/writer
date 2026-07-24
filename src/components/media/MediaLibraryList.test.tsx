import { describe, it, expect, vi } from 'vitest';

// Rows import the media facade (delete) transitively; mock the pdfjs seam so
// jsdom does not try to load real pdfjs (no DOMMatrix).
const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('@/lib/pdf/pdfAdapter', () => ({
  pdfjs: { getDocument, GlobalWorkerOptions: { workerSrc: '' } },
}));

import { renderWithProviders, screen } from '@/test/test-utils';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { MediaLibraryList, type MediaSection } from './MediaLibraryList';

const item = (id: string): MediaItem => ({
  id,
  spaceId: 's1',
  name: `${id}.pdf`,
  mime: PDF_MIME,
  size: 1,
  pageCount: 1,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  createdAt: 1,
  updatedAt: 1,
});

describe('MediaLibraryList', () => {
  it('renders a labelled group header only when the section has a label', () => {
    const sections: MediaSection[] = [
      { key: 'g', label: 'ADDED TODAY', items: [item('a')] },
      { key: 'flat', label: null, items: [item('b')] },
    ];
    renderWithProviders(
      <MediaLibraryList sections={sections} counts={new Map()} onOpen={vi.fn()} />,
    );
    const headers = screen.getAllByTestId('media-library-group');
    expect(headers).toHaveLength(1);
    expect(headers[0]).toHaveTextContent('ADDED TODAY');
    expect(screen.getByTestId('media-row-a')).toBeInTheDocument();
    expect(screen.getByTestId('media-row-b')).toBeInTheDocument();
  });

  it('passes each row its highlight count', () => {
    renderWithProviders(
      <MediaLibraryList
        sections={[{ key: 'g', label: null, items: [item('a')] }]}
        counts={new Map([['a', 4]])}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByTestId('media-row-highlights')).toHaveTextContent('4 highlights');
  });
});
