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
import type { MediaItem } from '@/db/schema';
import { MediaLibrarySurface } from './MediaLibrarySurface';

const makeMedia = (overrides: Partial<MediaItem>): MediaItem => ({
  id: 'm',
  spaceId: 's1',
  name: 'doc.pdf',
  mime: PDF_MIME,
  size: 1024,
  pageCount: 1,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

describe('MediaLibrarySurface', () => {
  it('shows the empty state with no media', async () => {
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    expect(await screen.findByTestId('media-library-empty')).toBeInTheDocument();
  });

  it('renders a card per media item', async () => {
    await db.media.bulkPut([
      makeMedia({ id: 'a', name: 'a.pdf', createdAt: 100 }),
      makeMedia({ id: 'b', name: 'b.pdf', createdAt: 200 }),
    ]);
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    await waitFor(() => {
      expect(screen.getByTestId('media-card-a')).toBeInTheDocument();
    });
    expect(screen.getByTestId('media-card-b')).toBeInTheDocument();
    expect(screen.queryByTestId('media-library-empty')).not.toBeInTheDocument();
  });

  it('upload button is reachable by keyboard', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    await screen.findByTestId('media-library-empty');
    await user.tab();
    expect(screen.getByTestId('media-upload-button')).toHaveFocus();
  });

  it('opens a media item by navigating to its viewer route', async () => {
    navigateSpy.mockClear();
    await db.media.put(makeMedia({ id: 'm1', name: 'x.pdf' }));
    renderWithProviders(<MediaLibrarySurface spaceId="s1" />);
    const open = await screen.findByTestId('media-card-m1-open');
    await userEvent.click(open);
    expect(navigateSpy).toHaveBeenCalledWith('/s/s1/library/m1');
  });
});
