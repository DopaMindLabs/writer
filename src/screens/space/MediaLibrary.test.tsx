import { renderAtRoute, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleSpace } from '@/test/fixtures';
import { MediaLibraryScreen } from './MediaLibrary';

describe('MediaLibraryScreen', () => {
  it('renders the media library surface for a seeded space', async () => {
    await db.spaces.put(sampleSpace);
    renderAtRoute(<MediaLibraryScreen />, {
      path: '/s/:spaceId/media',
      initialEntries: ['/s/s1/media'],
    });
    await waitFor(() => {
      expect(screen.getByTestId('media-library')).toBeInTheDocument();
    });
  });

  it('redirects to home when there is no space id', async () => {
    renderAtRoute(<MediaLibraryScreen />, {
      path: '/media',
      initialEntries: ['/media'],
    });
    expect(await screen.findByTestId('catch-all')).toBeInTheDocument();
  });
});
