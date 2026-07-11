import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation, useSearchParams } from 'react-router-dom';
import { renderWithProviders, screen } from '@/test/test-utils';
import { useUI } from '@/store/ui';
import { QuickSettingsSheetSection } from './QuickSettingsSheetSection';

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

const Harness = () => (
  <>
    <QuickSettingsSheetSection />
    <LocationProbe />
  </>
);

describe('QuickSettingsSheetSection', () => {
  beforeEach(() => {
    act(() => {
      useUI.getState().setTheme('light');
      useUI.getState().setReadingWidth('m');
      useUI.getState().setFloatingToolbarEnabled(false);
    });
  });

  it('renders theme, reading width, focus and floating-toolbar controls', () => {
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    expect(screen.getByTestId('mobile-more-quick-settings')).toBeInTheDocument();
    expect(screen.getByTestId('quick-settings-theme-dark')).toBeInTheDocument();
    expect(screen.getByTestId('quick-settings-width-s')).toBeInTheDocument();
    expect(screen.getByTestId('quick-settings-focus-toggle')).toHaveAttribute(
      'role',
      'switch',
    );
    expect(
      screen.getByTestId('quick-settings-floating-toolbar-toggle'),
    ).toHaveAttribute('role', 'switch');
  });

  it('uses the roomy md switch and omits the desk-keyboard hint', () => {
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    // md track is 44 px wide.
    expect(
      screen.getByTestId('quick-settings-focus-toggle').className,
    ).toContain('w-11');
    // The ⌘\ focus hint is a desktop cue and must not appear on the sheet.
    expect(screen.queryByText('⌘\\')).not.toBeInTheDocument();
  });

  it('updates the theme store when a theme chip is tapped', async () => {
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    await userEvent.click(screen.getByTestId('quick-settings-theme-dark'));
    expect(useUI.getState().theme).toBe('dark');
  });

  it('updates the reading width store when a width chip is tapped', async () => {
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    await userEvent.click(screen.getByTestId('quick-settings-width-s'));
    expect(useUI.getState().readingWidth).toBe('s');
  });

  it('toggles ?focus=1 in the URL when the focus switch is tapped', async () => {
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    expect(screen.getByTestId('probe-search').textContent).toBe('');
    await userEvent.click(screen.getByTestId('quick-settings-focus-toggle'));
    expect(screen.getByTestId('probe-search').textContent).toBe('focus=1');
  });

  it('updates the floating-toolbar store when the switch is tapped', async () => {
    renderWithProviders(<Harness />, { initialEntries: ['/s/s1/d/d1'] });
    expect(useUI.getState().floatingToolbarEnabled).toBe(false);
    await userEvent.click(
      screen.getByTestId('quick-settings-floating-toolbar-toggle'),
    );
    expect(useUI.getState().floatingToolbarEnabled).toBe(true);
  });
});
