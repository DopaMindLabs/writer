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

  it('switches to the Theme tab and changes theme via chips', () => {
    const { getByRole } = renderWithProviders(<SettingsScreen />, {
      initialEntries: ['/settings'],
    });
    fireEvent.click(getByRole('button', { name: 'Theme' }));
    expect(getByRole('heading', { name: 'Theme' })).toBeInTheDocument();
    fireEvent.click(getByRole('button', { name: 'Dark' }));
    expect(useUI.getState().theme).toBe('dark');
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
    const { getByRole, getByText } = renderWithProviders(<SettingsScreen />, {
      initialEntries: ['/settings?tab=account'],
    });
    expect(getByRole('heading', { name: 'Account' })).toBeInTheDocument();
    expect(getByText(/Cloud sync is unavailable/i)).toBeInTheDocument();
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
