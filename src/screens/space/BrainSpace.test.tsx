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

  it('prefers the persisted lastDocId over docs[0] when it still exists', async () => {
    await db.spaces.put(sampleSpace);
    await db.docs.put(sampleDoc);
    // A second doc so the fallback can meaningfully differ from docs[0]: the
    // persisted lastDocId points at d2, which must win over the first doc.
    await db.docs.put({ ...sampleDoc, id: 'd2', name: 'Second' });
    useUI.getState().setCurrentDocId('d2');
    const { findByTestId } = renderAtRoute(<BrainSpaceScreen />, {
      path: '/s/:spaceId/brain-space',
      initialEntries: ['/s/s1/brain-space'],
    });
    await waitFor(async () => {
      const readTab = await findByTestId('mobile-tabs-read');
      expect(readTab).toHaveAttribute('href', '/s/s1/d/d2/read');
    });
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
    const { findByTestId } = renderAtRoute(<BrainSpaceScreen />, {
      path: '/s/:spaceId/brain-space',
      initialEntries: ['/s/s1/brain-space'],
    });
    // The stale id must resolve to docs[0] (d1), never to /s/s1/d/ghost-doc/read.
    await waitFor(async () => {
      const readTab = await findByTestId('mobile-tabs-read');
      expect(readTab).toHaveAttribute('href', '/s/s1/d/d1/read');
    });
    act(() => { useUI.getState().setCurrentDocId(null); });
  });
});
