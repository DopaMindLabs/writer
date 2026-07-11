import {
  renderWithProviders,
  screen,
  act,
  waitFor,
  fireEvent,
} from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import {
  FIXED_TIME,
  sampleSpace,
  seedBasicSpace,
  seedMultipleSpaces,
} from '@/test/fixtures';
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

  it('lists spaces by name with the active space marked current', async () => {
    await seedMultipleSpaces();
    renderWithProviders(<MobileNavDrawer spaceId="s2" activeDocId={null} />, {
      initialEntries: ['/s/s2'],
    });
    await openAfterMount();
    // Names are shown, not just the two-letter tag as on the desktop rail.
    const beta = await screen.findByTestId('mobile-nav-space-s2');
    expect(beta).toHaveTextContent('Beta');
    expect(beta).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('mobile-nav-space-s1')).not.toHaveAttribute(
      'aria-current',
    );
    // The shared space announces its state to assistive tech.
    expect(beta).toHaveTextContent(/shared/i);
  });

  it('hands off to the more sheet from the Quick settings row', async () => {
    await seedBasicSpace();
    renderWithProviders(<MobileNavDrawer spaceId="s1" activeDocId={null} />, {
      initialEntries: ['/s/s1'],
    });
    await openAfterMount();
    await userEvent.click(await screen.findByTestId('mobile-nav-quick-settings'));
    expect(useUI.getState().mobileNavOpen).toBe(false);
    expect(useUI.getState().mobileMoreOpen).toBe(true);
  });

  it('closes on Escape', async () => {
    await db.spaces.put(sampleSpace);
    renderWithProviders(<MobileNavDrawer spaceId="s1" activeDocId={null} />);
    await openAfterMount();
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      { expect(useUI.getState().mobileNavOpen).toBe(false); },
    );
  });
});

describe('snapshot', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['Date', 'setTimeout', 'clearTimeout'],
      shouldAdvanceTime: true,
    });
    vi.setSystemTime(FIXED_TIME);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

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
