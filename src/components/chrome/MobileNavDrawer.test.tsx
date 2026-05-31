import { renderWithProviders, screen, act, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { sampleSpace, seedBasicSpace } from '@/test/fixtures';
import { db } from '@/db/db';
import { useUI } from '@/store/ui';
import { MobileNavDrawer } from './MobileNavDrawer';

const openAfterMount = async () => {
  // The drawer's useEffect closes itself on pathname change, including the
  // initial mount. Open it on the next microtask so the effect has already run.
  await act(async () => {
    useUI.getState().setMobileNavOpen(true);
    await Promise.resolve();
  });
};

describe('MobileNavDrawer', () => {
  it('does not render Dialog content when closed', () => {
    renderWithProviders(<MobileNavDrawer spaceId="s1" activeDocId={null} />);
    expect(useUI.getState().mobileNavOpen).toBe(false);
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders Sidebar contents when open', async () => {
    await seedBasicSpace();
    renderWithProviders(
      <MobileNavDrawer spaceId="s1" activeDocId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    await openAfterMount();
    expect(await screen.findByText('Sample Doc')).toBeInTheDocument();
  });

  it('closes when the close button is clicked', async () => {
    await db.spaces.put(sampleSpace);
    renderWithProviders(<MobileNavDrawer spaceId="s1" activeDocId={null} />);
    await openAfterMount();
    const close = await screen.findByRole('button', { name: /close|nav\.close/i });
    await userEvent.click(close);
    await waitFor(() =>
      { expect(useUI.getState().mobileNavOpen).toBe(false); },
    );
  });
});

describe('snapshot', () => {
  it('matches the open drawer with the seeded space contents', async () => {
    await seedBasicSpace();
    renderWithProviders(<MobileNavDrawer spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    await openAfterMount();
    // Wait for the embedded Sidebar to hydrate its async Dexie data.
    await screen.findByText('Sample Doc');
    // The drawer renders into a portal on document.body, not into `container`.
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).toMatchSnapshot();
  });
});
