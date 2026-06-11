import {
  renderWithProviders,
  screen,
  act,
  waitFor,
  fireEvent,
} from '@/test/test-utils';
import { sampleSpace, seedBasicSpace } from '@/test/fixtures';
import { db } from '@/db/db';
import { useUI } from '@/store/ui';
import { MobileNavDrawer } from './MobileNavDrawer';

const openAfterMount = async () => {
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

  it('closes on Escape', async () => {
    await db.spaces.put(sampleSpace);
    renderWithProviders(<MobileNavDrawer spaceId="s1" activeDocId={null} />);
    await openAfterMount();
    await screen.findByRole('dialog');
    // Opening the drawer autofocuses the SpaceRail alpha chip, whose tooltip
    // becomes the topmost dismissable layer; blur it so Escape hits the drawer.
    act(() => { (document.activeElement as HTMLElement | null)?.blur(); });
    fireEvent.keyDown(document, { key: 'Escape' });
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
    await screen.findByText('Sample Doc');
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).toMatchSnapshot();
  });
});
