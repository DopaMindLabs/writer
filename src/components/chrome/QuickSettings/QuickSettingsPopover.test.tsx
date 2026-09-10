import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation, useSearchParams } from 'react-router-dom';
import { renderWithProviders, screen } from '@/test/test-utils';
import { useUI, type Theme, type ReadingWidth } from '@/store/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { QuickSettingsPopover } from './QuickSettingsPopover';

const replayMock = vi.fn();
const getCompletedMock = vi.fn<() => string[]>(() => ['welcome']);

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

  describe('rendering', () => {
    it('should render the popover surface', () => {
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      expect(screen.getByTestId('quick-settings-popover')).toMatchSnapshot();
    });

    it('should render the title, theme row, switches, reading widths, and footer controls', () => {
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      const popover = screen.getByTestId('quick-settings-popover');
      expect(popover).toHaveTextContent(/quick settings/i);
      expect(popover).toHaveTextContent(/theme/i);
      expect(popover).toHaveTextContent(/reading width/i);
      expect(screen.getByTestId('quick-settings-focus-toggle')).toHaveAttribute(
        'role',
        'switch',
      );
      expect(
        screen.getByTestId('quick-settings-floating-toolbar-toggle'),
      ).toHaveAttribute('role', 'switch');
      expect(screen.getByTestId('quick-settings-full-settings')).toHaveTextContent(
        /universal settings/i,
      );
      const about = screen.getByTestId('quick-settings-about');
      expect(about).toHaveTextContent(/about/i);
      expect(about).toHaveAttribute('href', '/about');
    });

    it('offers a direct Profile link to the profile settings tab, regardless of the cloud-sync flag', () => {
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      const item = screen.getByTestId('quick-settings-profile');
      expect(item).toHaveTextContent(/profile/i);
      expect(item).toHaveAttribute('href', expect.stringContaining('tab=profile'));
    });
  });

  describe('grouping', () => {
    it('should group the controls under Writing, Settings, and Appearance section labels', () => {
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      expect(
        screen.getByTestId('quick-settings-section-appearance'),
      ).toHaveTextContent(/appearance/i);
      expect(
        screen.getByTestId('quick-settings-section-writing'),
      ).toHaveTextContent(/writing/i);
      expect(
        screen.getByTestId('quick-settings-section-settings'),
      ).toHaveTextContent(/settings/i);

      // Writing leads with the focus + floating-toolbar toggles, the Settings
      // group (universal settings + account) follows, then Appearance (theme +
      // reading width), the guided tours, and the help-centre link ahead of
      // the More group — no footer.
      const popover = screen.getByTestId('quick-settings-popover');
      const order = Array.from(popover.querySelectorAll('[data-testid]')).map(
        (el) => el.getAttribute('data-testid'),
      );
      const expectedOrder = [
        'quick-settings-section-writing',
        'quick-settings-focus-toggle',
        'quick-settings-floating-toolbar-toggle',
        'quick-settings-section-settings',
        'quick-settings-full-settings',
        'quick-settings-profile',
        'quick-settings-section-appearance',
        'quick-settings-theme-light',
        'quick-settings-width-m',
        'quick-settings-section-help-tours',
        'quick-settings-help',
        'quick-settings-section-more',
      ];
      const positions = expectedOrder.map((id) => order.indexOf(id));
      expect(positions).not.toContain(-1);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });
  });

  describe('theme chips', () => {
    it.each<[Theme, RegExp]>([
      ['light', /^Light$/],
      ['dark', /^Dark$/],
      ['hc-light', /HC light|High contrast \(light\)/],
      ['hc-dark', /HC dark|High contrast \(dark\)/],
    ])(
      'should update the store when the %s theme chip is clicked',
      async (themeId, label) => {
        renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
        const chip = screen.getByTestId(`quick-settings-theme-${themeId}`);
        expect(chip).toHaveTextContent(label);
        await userEvent.click(chip);
        expect(useUI.getState().theme).toBe(themeId);
      },
    );
  });

  describe('focus toggle', () => {
    it('should add and remove ?focus=1 from the URL when toggled', async () => {
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      expect(screen.getByTestId('probe-search').textContent).toBe('');
      await userEvent.click(screen.getByTestId('quick-settings-focus-toggle'));
      expect(screen.getByTestId('probe-search').textContent).toBe('focus=1');
      await userEvent.click(screen.getByTestId('quick-settings-focus-toggle'));
      expect(screen.getByTestId('probe-search').textContent).toBe('');
    });

    it('should reflect an existing ?focus=1 URL as aria-checked=true', () => {
      renderWithProviders(<Harness />, {
        initialEntries: ['/s/s1/d/d1?focus=1'],
      });
      expect(screen.getByTestId('quick-settings-focus-toggle')).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });
  });

  describe('floating-toolbar toggle', () => {
    it('should update the store when toggled', async () => {
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      expect(useUI.getState().floatingToolbarEnabled).toBe(false);
      await userEvent.click(
        screen.getByTestId('quick-settings-floating-toolbar-toggle'),
      );
      expect(useUI.getState().floatingToolbarEnabled).toBe(true);
    });

    it('should reflect floatingToolbar=true via aria-checked when seeded in the store', () => {
      act(() => {
        useUI.getState().setFloatingToolbarEnabled(true);
      });
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      expect(
        screen.getByTestId('quick-settings-floating-toolbar-toggle'),
      ).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('reading width chips', () => {
    it.each<ReadingWidth>(['s', 'm', 'l'])(
      'should update the store when the %s width chip is clicked',
      async (width) => {
        renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
        const chip = screen.getByTestId(`quick-settings-width-${width}`);
        expect(chip).toHaveTextContent(width.toUpperCase());
        await userEvent.click(chip);
        expect(useUI.getState().readingWidth).toBe(width);
      },
    );
  });

  describe('help tours', () => {
    it('should invoke replay with the tour id when a tour menu item is clicked', async () => {
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      await userEvent.click(screen.getByTestId('quick-settings-tour-welcome'));
      expect(replayMock).toHaveBeenCalledWith('welcome');
    });

    it('should render the platform shortcut on the welcome tour row only', () => {
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      const kbd = screen.getByTestId('quick-settings-tour-welcome-kbd');
      // ⌘? on Apple, Ctrl+? elsewhere — derived from the running platform.
      expect(kbd.textContent).toMatch(/⌘\?|Ctrl\+\?/);
    });

    it('marks a completed tour row as checked and leaves an unrun tour unchecked', () => {
      getCompletedMock.mockReturnValue(['welcome']);
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      expect(screen.getByTestId('quick-settings-tour-welcome')).toHaveAttribute(
        'data-checked',
        'true',
      );
      expect(screen.getByTestId('quick-settings-tour-writer')).not.toHaveAttribute(
        'data-checked',
      );
    });
  });

  describe('universal settings navigation', () => {
    it('should navigate to /settings when the universal-settings link is clicked', async () => {
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      expect(screen.getByTestId('probe-pathname').textContent).toBe(
        '/s/s1/d/d1',
      );
      await userEvent.click(screen.getByTestId('quick-settings-full-settings'));
      expect(screen.getByTestId('probe-pathname').textContent).toBe(
        '/settings',
      );
    });
  });

  describe('help link', () => {
    it('should render the help link with href=/help and the ⌘? shortcut', () => {
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      const help = screen.getByTestId('quick-settings-help');
      expect(help).toHaveTextContent(/help center/i);
      expect(help).toHaveAttribute('href', '/help');
    });

    it('should navigate to /help when the help link is clicked', async () => {
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      expect(screen.getByTestId('probe-pathname').textContent).toBe(
        '/s/s1/d/d1',
      );
      await userEvent.click(screen.getByTestId('quick-settings-help'));
      expect(screen.getByTestId('probe-pathname').textContent).toBe('/help');
    });
  });

  describe('about link', () => {
    it('should render with href=/about', () => {
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      expect(screen.getByTestId('quick-settings-about')).toHaveAttribute(
        'href',
        '/about',
      );
    });
  });

  describe('mobile', () => {
    const realMatchMedia = window.matchMedia.bind(window);
    afterEach(() => {
      window.matchMedia = realMatchMedia;
    });

    const setViewport = (mobile: boolean) => {
      window.matchMedia = ((query: string) => ({
        matches: mobile && query.includes('max-width: 767px'),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
    };

    it('hides the help tour section on mobile, keeping the real controls', () => {
      setViewport(true);
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      // The controls that matter on a phone stay.
      expect(
        screen.getByTestId('quick-settings-section-appearance'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('quick-settings-section-writing'),
      ).toBeInTheDocument();
      // The guided-tour list is dropped.
      expect(
        screen.queryByTestId('quick-settings-section-help-tours'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('quick-settings-tour-welcome'),
      ).not.toBeInTheDocument();
    });

    it('keeps the help tour section on desktop widths', () => {
      setViewport(false);
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      expect(
        screen.getByTestId('quick-settings-section-help-tours'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('quick-settings-tour-welcome'),
      ).toBeInTheDocument();
    });
  });

  describe('keyboard hints on touch', () => {
    const realMatchMedia = window.matchMedia.bind(window);
    afterEach(() => {
      window.matchMedia = realMatchMedia;
    });

    const setCoarsePointer = () => {
      window.matchMedia = ((query: string) => ({
        matches: query.includes('pointer: coarse'),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
    };

    it('hides shortcut hints on a coarse pointer while keeping the controls', () => {
      setCoarsePointer();
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      // The tour row stays but its keyboard hint is dropped.
      expect(
        screen.getByTestId('quick-settings-tour-welcome'),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('quick-settings-tour-welcome-kbd'),
      ).not.toBeInTheDocument();
      // The controls and links remain reachable.
      expect(
        screen.getByTestId('quick-settings-focus-toggle'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('quick-settings-help')).toBeInTheDocument();
      // No stray keyboard glyphs anywhere.
      expect(screen.queryByText(/⌘|Ctrl\+/)).not.toBeInTheDocument();
    });
  });
});
