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
    expect(getByText(/Cloud sync is not available yet/i)).toBeInTheDocument();
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

  it('renders the real export/import tab with a working import control', () => {
    const { getByTestId } = renderWithProviders(<SettingsScreen />, {
      initialEntries: ['/settings?tab=export'],
    });
    expect(getByTestId('settings-export-import')).toBeInTheDocument();
    expect(getByTestId('settings-import-button')).toBeEnabled();
    expect(getByTestId('settings-import-file-input')).toHaveAttribute(
      'type',
      'file',
    );
  });

  it('stacks every sibling section of the active group on one page', () => {
    const { getByRole } = renderWithProviders(<SettingsScreen />, {
      initialEntries: ['/settings'],
    });
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
    expect(queryByRole('heading', { name: 'Editor' })).not.toBeInTheDocument();
  });
});
