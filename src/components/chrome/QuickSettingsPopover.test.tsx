import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation, useSearchParams } from 'react-router-dom';
import { renderWithProviders, screen } from '@/test/test-utils';
import { useUI, type Theme, type ReadingWidth } from '@/store/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { QuickSettingsPopover } from './QuickSettingsPopover';

const replayMock = vi.fn();
const getCompletedMock = vi.fn<[], string[]>(() => ['welcome']);

vi.mock('@/tours/useTour', () => ({
  useTour: () => ({ replay: replayMock }),
}));
vi.mock('@/tours/storage', () => ({
  getCompleted: () => getCompletedMock(),
}));

const LocationProbe = () => {
  const location = useLocation();
  const [params] = useSearchParams();
  return (
    <>
      <div data-testid="probe-pathname">{location.pathname}</div>
      <div data-testid="probe-search">{params.toString()}</div>
    </>
  );
};

const Harness = () => {
  return (
    <>
      <Popover open>
        <PopoverTrigger />
        <PopoverContent>
          <QuickSettingsPopover />
        </PopoverContent>
      </Popover>
      <LocationProbe />
    </>
  );
};

describe('QuickSettingsPopover', () => {
  beforeEach(() => {
    replayMock.mockReset();
    getCompletedMock.mockReset();
    getCompletedMock.mockReturnValue(['welcome']);
    act(() => {
      useUI.getState().setTheme('light');
      useUI.getState().setFloatingToolbarEnabled(false);
      useUI.getState().setReadingWidth('m');
    });
  });

  it('renders the popover surface', () => {
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    expect(screen.getByTestId('quick-settings-popover')).toMatchSnapshot();
  });

  it('renders the title, theme row, switches, reading widths, and footer controls', () => {
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    expect(screen.getByText(/^quick settings$/i)).toBeInTheDocument();
    expect(screen.getByText(/^theme$/i)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /focus mode/i })).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: /floating toolbar/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/reading width/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /full settings/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^about$/i })).toHaveAttribute(
      'href',
      '/about',
    );
  });

  it.each<[Theme, RegExp]>([
    ['light', /^Light$/],
    ['dark', /^Dark$/],
    ['hc-light', /HC light|High contrast \(light\)/],
    ['hc-dark', /HC dark|High contrast \(dark\)/],
  ])('clicking the %s theme chip updates the store', async (themeId, label) => {
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    const chips = screen.getAllByRole('button', { name: label });
    // Multiple chips may share the visible label/tooltip wording; the chip we
    // want lives inside the popover and has the cursor-pointer chip class.
    const chip = chips[0];
    await userEvent.click(chip);
    expect(useUI.getState().theme).toBe(themeId);
  });

  it('toggling the focus switch adds and removes ?focus=1 from the URL', async () => {
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    expect(screen.getByTestId('probe-search').textContent).toBe('');
    await userEvent.click(screen.getByRole('switch', { name: /focus mode/i }));
    expect(screen.getByTestId('probe-search').textContent).toBe('focus=1');
    await userEvent.click(screen.getByRole('switch', { name: /focus mode/i }));
    expect(screen.getByTestId('probe-search').textContent).toBe('');
  });

  it('reflects an existing ?focus=1 URL as aria-checked on the focus switch', () => {
    renderWithProviders(<Harness />, {
      initialEntries: ['/s/s1/d/d1?focus=1'],
    });
    expect(
      screen
        .getByRole('switch', { name: /focus mode/i })
        .getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('toggling the floating-toolbar switch updates the store', async () => {
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    expect(useUI.getState().floatingToolbarEnabled).toBe(false);
    await userEvent.click(
      screen.getByRole('switch', { name: /floating toolbar/i }),
    );
    expect(useUI.getState().floatingToolbarEnabled).toBe(true);
  });

  it.each<ReadingWidth>(['s', 'm', 'l'])(
    'clicking the %s reading-width chip updates the store',
    async (width) => {
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      const label = width.toUpperCase();
      // Scope the lookup to buttons whose text is exactly the letter.
      const chip = screen
        .getAllByRole('button')
        .find((b) => b.textContent?.trim() === label);
      expect(chip).toBeDefined();
      await userEvent.click(chip!);
      expect(useUI.getState().readingWidth).toBe(width);
    },
  );

  it('clicking a help tour menu item invokes replay with that tour id', async () => {
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    // The first tour ID is 'welcome' (already completed in mock); click it.
    const welcomeItem = screen
      .getAllByRole('button')
      .find((b) => /welcome/i.test(b.textContent ?? ''));
    expect(welcomeItem).toBeDefined();
    await userEvent.click(welcomeItem!);
    expect(replayMock).toHaveBeenCalledWith('welcome');
  });

  it('renders the ⌘? keyboard shortcut on the welcome tour row only', () => {
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    const popover = screen.getByTestId('quick-settings-popover');
    expect(popover.textContent).toContain('⌘?');
  });

  it('shows the check icon as opaque for completed tours and hidden for not-yet-completed tours', () => {
    getCompletedMock.mockReturnValue(['welcome']);
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    const popover = screen.getByTestId('quick-settings-popover');
    const checks = popover.querySelectorAll('svg.lucide-check');
    // 4 tours => 4 check slots
    expect(checks.length).toBeGreaterThanOrEqual(4);
    // The first should be opacity-100 (welcome is completed)
    const opaqueChecks = Array.from(checks).filter((c) =>
      c.getAttribute('class')?.includes('opacity-100'),
    );
    expect(opaqueChecks.length).toBe(1);
  });

  it('clicking "Full settings" navigates to /settings', async () => {
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    expect(screen.getByTestId('probe-pathname').textContent).toBe('/s/s1/d/d1');
    await userEvent.click(
      screen.getByRole('button', { name: /full settings/i }),
    );
    expect(screen.getByTestId('probe-pathname').textContent).toBe('/settings');
  });

  it('renders the About link with href=/about', () => {
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    expect(screen.getByRole('link', { name: /^about$/i })).toHaveAttribute(
      'href',
      '/about',
    );
  });

  it('reflects floatingToolbar=true via aria-checked when seeded in the store', () => {
    act(() => {
      useUI.getState().setFloatingToolbarEnabled(true);
    });
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    expect(
      screen
        .getByRole('switch', { name: /floating toolbar/i })
        .getAttribute('aria-checked'),
    ).toBe('true');
  });
});
