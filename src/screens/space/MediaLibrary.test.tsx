// Mock only the pdfjs adapter seam; the surface imports the media facade
// transitively.
const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('@/lib/pdf/pdfAdapter', () => ({
  pdfjs: { getDocument, GlobalWorkerOptions: { workerSrc: '' } },
}));

import { act, renderAtRoute, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { PDF_MIME } from '@/data/media';
import { sampleSpace, seedBasicSpace } from '@/test/fixtures';
import { useUI } from '@/store/ui';
import type { MediaItem } from '@/db/schema';
import { MediaLibraryScreen } from './MediaLibrary';

const sampleMedia: MediaItem = {
  id: 'm1',
  spaceId: 's1',
  name: 'seeded.pdf',
  mime: PDF_MIME,
  size: 2048,
  pageCount: 4,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  createdAt: 1,
  updatedAt: 1,
};

const renderScreen = () =>
  renderAtRoute(<MediaLibraryScreen />, {
    path: '/s/:spaceId/library',
    initialEntries: ['/s/s1/library'],
  });

describe('MediaLibraryScreen', () => {
  it('renders the empty library for a space with no media', async () => {
    await db.spaces.put(sampleSpace);
    const { findByTestId } = renderScreen();
    expect(await findByTestId('media-library-empty')).toBeInTheDocument();
  });

  it('renders a card for a seeded media item', async () => {
    await db.spaces.put(sampleSpace);
    await db.media.put(sampleMedia);
    const { findByTestId } = renderScreen();
    await waitFor(async () => {
      expect(await findByTestId('media-card-m1-name')).toHaveTextContent(
        'seeded.pdf',
      );
    });
  });

  it('redirects home when spaceId is missing', () => {
    const { queryByTestId } = renderAtRoute(<MediaLibraryScreen />, {
      path: '/library',
      initialEntries: ['/library'],
    });
    expect(queryByTestId('catch-all')).toBeInTheDocument();
  });

  it('renders the docs sidebar so the user can navigate back to a doc', async () => {
    await seedBasicSpace();
    act(() => {
      useUI.getState().setCurrentDocId('d1');
    });
    const { findByRole } = renderScreen();
    const docLink = await findByRole('link', { name: /sample doc/i });
    expect(docLink).toHaveAttribute('href', '/s/s1/d/d1');
  });
});
