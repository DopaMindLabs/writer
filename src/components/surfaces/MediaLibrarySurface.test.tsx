// Mock only the pdfjs adapter seam; the composed children import the media
// facade transitively.
const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('@/lib/pdf/pdfAdapter', () => ({
  pdfjs: { getDocument, GlobalWorkerOptions: { workerSrc: '' } },
}));

const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { PDF_MIME } from '@/data/media';
import type { MediaItem, PdfAnnotation } from '@/db/schema';
import { MediaLibrarySurface } from './MediaLibrarySurface';

const DAY = 86_400_000;
const NOW = Date.now();

const makeMedia = (overrides: Partial<MediaItem> & { id: string }): MediaItem => ({
  spaceId: 's1',
  name: 'doc.pdf',
  mime: PDF_MIME,
  size: 1024,
  pageCount: 1,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const anno = (id: string, mediaId: string): PdfAnnotation => ({
  id,
  mediaId,
  spaceId: 's1',
  kind: 'highlight',
  page: 1,
  rects: [{ x: 0.1, y: 0.1, w: 0.2, h: 0.05 }],
  quote: 'q',
  color: 'yellow',
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
});

const seedRows = () =>
  db.media.bulkPut([
    makeMedia({ id: 'a', name: 'Alpha.pdf', createdAt: NOW }),
    makeMedia({ id: 'b', name: 'Beta.pdf', createdAt: NOW - 2 * DAY, openedAt: NOW }),
  ]);

describe('MediaLibrarySurface', () => {
  it('shows the empty state with no media', async () => {
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    expect(await screen.findByTestId('media-library-empty')).toBeInTheDocument();
  });

  it('lists a row per media item', async () => {
    await seedRows();
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    expect(await screen.findByTestId('media-row-a')).toBeInTheDocument();
    expect(screen.getByTestId('media-row-b')).toBeInTheDocument();
    expect(screen.queryByTestId('media-library-empty')).not.toBeInTheDocument();
  });

  it('counts total pdfs and annotations in the header', async () => {
    await seedRows();
    await db.pdfAnnotations.bulkPut([anno('h1', 'a'), anno('h2', 'a')]);
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    await waitFor(() => {
      expect(screen.getByTestId('media-library-counts')).toHaveTextContent(
        '2 PDFs · 2 annotations',
      );
    });
  });

  it('filters rows by a name search', async () => {
    await seedRows();
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    await screen.findByTestId('media-row-a');
    await userEvent.type(screen.getByTestId('media-library-search'), 'beta');
    await waitFor(() => {
      expect(screen.queryByTestId('media-row-a')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('media-row-b')).toBeInTheDocument();
  });

  it('unread filter hides already-opened items', async () => {
    await seedRows();
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    await screen.findByTestId('media-row-a');
    await userEvent.click(screen.getByTestId('media-library-filter-unread'));
    await waitFor(() => {
      expect(screen.queryByTestId('media-row-b')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('media-row-a')).toBeInTheDocument();
  });

  it('annotated filter shows only highlighted items', async () => {
    await seedRows();
    await db.pdfAnnotations.put(anno('h1', 'a'));
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    await screen.findByTestId('media-row-a');
    await userEvent.click(screen.getByTestId('media-library-filter-annotated'));
    await waitFor(() => {
      expect(screen.queryByTestId('media-row-b')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('media-row-a')).toBeInTheDocument();
  });

  it('leaves the cited tab disabled', async () => {
    await seedRows();
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    await screen.findByTestId('media-row-a');
    const cited = screen.getByTestId('media-library-filter-cited');
    expect(cited).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(cited);
    // Still on "all": clicking the disabled tab changed nothing.
    expect(screen.getByTestId('media-library-filter-all')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('labels today, this week and month groups under the recent sort', async () => {
    await db.media.bulkPut([
      makeMedia({ id: 't', name: 'Today.pdf', createdAt: NOW }),
      makeMedia({ id: 'w', name: 'Week.pdf', createdAt: NOW - 3 * DAY }),
      makeMedia({ id: 'o', name: 'Old.pdf', createdAt: Date.UTC(2020, 0, 15, 12) }),
    ]);
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    expect(await screen.findByText('Added today')).toBeInTheDocument();
    expect(screen.getByText('Earlier this week')).toBeInTheDocument();
    expect(screen.getByText('JANUARY 2020')).toBeInTheDocument();
  });

  it('sort by name flattens the date groups', async () => {
    await db.media.bulkPut([
      makeMedia({ id: 't', name: 'Today.pdf', createdAt: NOW }),
      makeMedia({ id: 'o', name: 'Old.pdf', createdAt: Date.UTC(2020, 0, 15, 12) }),
    ]);
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    await screen.findByTestId('media-row-t');
    expect(screen.getAllByTestId('media-library-group').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByTestId('media-library-sort'));
    await userEvent.click(await screen.findByTestId('media-library-sort-name'));
    await waitFor(() => {
      expect(screen.queryByTestId('media-library-group')).not.toBeInTheDocument();
    });
  });

  it('footer counts the shown rows of the total', async () => {
    await seedRows();
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    await screen.findByTestId('media-row-a');
    expect(screen.getByTestId('media-library-footer-count')).toHaveTextContent(
      'Showing 2 of 2',
    );
    await userEvent.type(screen.getByTestId('media-library-search'), 'alpha');
    await waitFor(() => {
      expect(screen.getByTestId('media-library-footer-count')).toHaveTextContent(
        'Showing 1 of 2',
      );
    });
  });

  it('opens a row by navigating to its viewer route', async () => {
    navigateSpy.mockClear();
    await db.media.put(makeMedia({ id: 'm1', name: 'x.pdf' }));
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    await userEvent.click(await screen.findByTestId('media-row-m1-open'));
    expect(navigateSpy).toHaveBeenCalledWith('/s/s1/library/m1');
  });

  it('keeps the upload button reachable by keyboard', async () => {
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    await screen.findByTestId('media-library-empty');
    await userEvent.tab();
    expect(screen.getByTestId('media-upload-button')).toHaveFocus();
  });
});
