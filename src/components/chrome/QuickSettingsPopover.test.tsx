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
        /full settings/i,
      );
      const about = screen.getByTestId('quick-settings-about');
      expect(about).toHaveTextContent(/about/i);
      expect(about).toHaveAttribute('href', '/about');
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

    it('should render the ⌘? keyboard shortcut on the welcome tour row only', () => {
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      const kbd = screen.getByTestId('quick-settings-tour-welcome-kbd');
      expect(kbd).toHaveTextContent('⌘?');
    });

    it('should mark completed tours with an opaque check and others with a hidden check', () => {
      getCompletedMock.mockReturnValue(['welcome']);
      renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
      const welcomeCheck = screen.getByTestId(
        'quick-settings-tour-welcome-check',
      );
      expect(welcomeCheck.getAttribute('class')).toContain('opacity-100');
    });
  });

  describe('full settings navigation', () => {
    it('should navigate to /settings when the full-settings link is clicked', async () => {
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
});
