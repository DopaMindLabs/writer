import { act, within } from '@testing-library/react';
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
    const { getByTestId } = renderWithProviders(<SettingsScreen />, {
      initialEntries: ['/settings'],
    });
    // Scope to the floating-toolbar row: the Doc inspector section (same group)
    // also renders On/Off chips on this stacked page.
    const row = within(getByTestId('setting-floating-toolbar'));
    expect(useUI.getState().floatingToolbarEnabled).toBe(false);
    fireEvent.click(row.getByRole('button', { name: 'On' }));
    expect(useUI.getState().floatingToolbarEnabled).toBe(true);
    fireEvent.click(row.getByRole('button', { name: 'Off' }));
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
    expect(getByText(/Cloud sync is not available yet/i)).toBeInTheDocument();
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

  it('stacks every sibling section of the active group on one page', () => {
    const { getByRole } = renderWithProviders(<SettingsScreen />, {
      initialEntries: ['/settings'],
    });
    // The Preferences group renders General … Editor … Typography together,
    // not just the selected Editor section.
    expect(getByRole('heading', { name: 'General' })).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Editor' })).toBeInTheDocument();
    expect(getByRole('heading', { name: /typography/i })).toBeInTheDocument();
  });

  it('swaps the stacked page when a tab in another group is selected', () => {
    const { getByTestId, getByRole, queryByRole } = renderWithProviders(
      <SettingsScreen />,
      { initialEntries: ['/settings'] },
    );
    fireEvent.click(getByTestId('settings-tab-account'));
    expect(getByRole('heading', { name: 'Account' })).toBeInTheDocument();
    // The Preferences group is no longer mounted.
    expect(queryByRole('heading', { name: 'Editor' })).not.toBeInTheDocument();
  });
});
