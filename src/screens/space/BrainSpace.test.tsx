import { act, renderAtRoute, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { useUI } from '@/store/ui';
import {
  sampleDoc,
  sampleSpace,
  seedBrainSpaceCanvas,
} from '@/test/fixtures';
import { BrainSpaceScreen } from './BrainSpace';

describe('BrainSpaceScreen', () => {
  it('renders brain space canvas with seeded notes', async () => {
    await seedBrainSpaceCanvas();
    const { findAllByText } = renderAtRoute(<BrainSpaceScreen />, {
      path: '/s/:spaceId/brain-space',
      initialEntries: ['/s/s1/brain-space'],
    });
    const matches = await findAllByText('Hello', undefined, { timeout: 3000 });
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('redirects when spaceId is missing', () => {
    const { queryByTestId } = renderAtRoute(<BrainSpaceScreen />, {
      path: '/brain-space',
      initialEntries: ['/brain-space'],
    });
    expect(queryByTestId('catch-all')).toBeInTheDocument();
  });

  it('renders the focus rail in focus mode', async () => {
    await seedBrainSpaceCanvas();
    const { container } = renderAtRoute(<BrainSpaceScreen />, {
      path: '/s/:spaceId/brain-space',
      initialEntries: ['/s/s1/brain-space?focus=1'],
    });
    expect(container.querySelector('aside')).toBeInTheDocument();
  });

  it('uses the previously-current doc as the fallback when it still exists', async () => {
    await db.spaces.put(sampleSpace);
    await db.docs.put(sampleDoc);
    useUI.getState().setCurrentDocId(sampleDoc.id);
    const { container } = renderAtRoute(<BrainSpaceScreen />, {
      path: '/s/:spaceId/brain-space',
      initialEntries: ['/s/s1/brain-space'],
    });
    await waitFor(() => { expect(container.querySelector('main')).not.toBeNull(); });
    act(() => { useUI.getState().setCurrentDocId(null); });
  });

  it('links the mobile Read tab to the fallback doc', async () => {
    await db.spaces.put(sampleSpace);
    await db.docs.put(sampleDoc);
    const { findByTestId } = renderAtRoute(<BrainSpaceScreen />, {
      path: '/s/:spaceId/brain-space',
      initialEntries: ['/s/s1/brain-space'],
    });
    await waitFor(async () => {
      const readTab = await findByTestId('mobile-tabs-read');
      expect(readTab).toHaveAttribute('href', '/s/s1/d/d1/read');
    });
  });

  it('falls back to docs[0] when the persisted lastDocId no longer exists', async () => {
    await db.spaces.put(sampleSpace);
    await db.docs.put(sampleDoc);
    useUI.getState().setCurrentDocId('ghost-doc');
    const { container } = renderAtRoute(<BrainSpaceScreen />, {
      path: '/s/:spaceId/brain-space',
      initialEntries: ['/s/s1/brain-space'],
    });
    await waitFor(() => { expect(container.querySelector('main')).not.toBeNull(); });
    act(() => { useUI.getState().setCurrentDocId(null); });
  });
});
