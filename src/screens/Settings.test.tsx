import { act } from '@testing-library/react';
import { fireEvent, renderWithProviders } from '@/test/test-utils';
import { useUI } from '@/store/ui';
import { SettingsScreen } from './Settings';

describe('SettingsScreen', () => {
  beforeEach(() => {
    window.localStorage.clear();
    act(() => {
      useUI.setState({
        floatingToolbarEnabled: false,
        theme: 'light',
      });
    });
  });

  it('renders the Editor tab by default with the floating-toolbar control', () => {
    const { getByRole, getByText } = renderWithProviders(<SettingsScreen />, {
      initialEntries: ['/settings'],
    });
    expect(getByRole('heading', { name: 'Editor' })).toBeInTheDocument();
    expect(getByText('Floating toolbar')).toBeInTheDocument();
  });

  it('toggles floatingToolbarEnabled via the On chip', () => {
    const { getByRole } = renderWithProviders(<SettingsScreen />, {
      initialEntries: ['/settings'],
    });
    expect(useUI.getState().floatingToolbarEnabled).toBe(false);
    fireEvent.click(getByRole('button', { name: 'On' }));
    expect(useUI.getState().floatingToolbarEnabled).toBe(true);
    fireEvent.click(getByRole('button', { name: 'Off' }));
    expect(useUI.getState().floatingToolbarEnabled).toBe(false);
  });

  it('does not render a standalone Theme tab (theme moved to Quick Settings)', () => {
    const { queryByRole } = renderWithProviders(<SettingsScreen />, {
      initialEntries: ['/settings'],
    });
    // No "Theme" tab in the settings nav anymore.
    expect(queryByRole('button', { name: 'Theme' })).not.toBeInTheDocument();
  });

  it('shows a disabled checkbox on a coming-soon row', () => {
    const { getAllByRole } = renderWithProviders(<SettingsScreen />, {
      initialEntries: ['/settings'],
    });
    const checkboxes = getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    for (const cb of checkboxes) {
      expect(cb).toBeDisabled();
    }
  });

  it('renders coming-soon placeholder content on the Account tab', () => {
    const { getByRole, getByText, container } = renderWithProviders(
      <SettingsScreen />,
      { initialEntries: ['/settings?tab=account'] },
    );
    expect(getByRole('heading', { name: 'Account' })).toBeInTheDocument();
    // Placeholder hint mirrors the design's wording.
    expect(getByText(/Account sign-in is coming soon/i)).toBeInTheDocument();
    // And the placeholder is wrapped in a non-closable Coming Soon overlay.
    expect(
      container.querySelector('[data-coming-soon-overlay="true"]'),
    ).not.toBeNull();
  });

  it('renders the typography tab when activated', () => {
    const { getByRole } = renderWithProviders(<SettingsScreen />, {
      initialEntries: ['/settings?tab=typography'],
    });
    expect(getByRole('heading', { name: /typography/i })).toBeInTheDocument();
  });

  it('renders the shortcuts tab when activated', () => {
    const { getByRole } = renderWithProviders(<SettingsScreen />, {
      initialEntries: ['/settings?tab=shortcuts'],
    });
    expect(getByRole('heading', { name: /shortcuts/i })).toBeInTheDocument();
  });

  it('renders the backups tab when activated', () => {
    const { getByRole } = renderWithProviders(<SettingsScreen />, {
      initialEntries: ['/settings?tab=backups'],
    });
    expect(getByRole('heading', { name: /backups/i })).toBeInTheDocument();
  });
});
