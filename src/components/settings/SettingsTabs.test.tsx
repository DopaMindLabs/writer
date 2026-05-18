import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { SettingsTabs, type SettingsTabGroup } from './SettingsTabs';

const groups: SettingsTabGroup[] = [
  {
    label: 'Preferences',
    tabs: [
      { id: 'general', label: 'General' },
      { id: 'editor', label: 'Editor' },
    ],
  },
  {
    label: 'Data',
    tabs: [{ id: 'sync', label: 'Sync' }],
  },
];

describe('SettingsTabs', () => {
  it('renders the group headers in the desktop nav', () => {
    renderWithProviders(
      <SettingsTabs groups={groups} active="editor" onSelect={() => {}} />,
    );
    // Headers render at least once across the desktop section.
    expect(screen.getAllByText('Preferences').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Data').length).toBeGreaterThan(0);
  });

  it('marks the active tab with aria-current="page"', () => {
    renderWithProviders(
      <SettingsTabs groups={groups} active="editor" onSelect={() => {}} />,
    );
    // Tabs render twice (mobile + desktop) — check at least one button per id
    // carries the right aria-current value.
    const editors = screen.getAllByRole('button', { name: 'Editor' });
    expect(editors.some((b) => b.getAttribute('aria-current') === 'page')).toBe(
      true,
    );
    const generals = screen.getAllByRole('button', { name: 'General' });
    expect(
      generals.every((b) => b.getAttribute('aria-current') !== 'page'),
    ).toBe(true);
  });

  it('calls onSelect with the tab id when a tab is clicked', async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <SettingsTabs groups={groups} active="general" onSelect={onSelect} />,
    );
    const syncButton = screen.getAllByRole('button', { name: 'Sync' })[0];
    await userEvent.click(syncButton);
    expect(onSelect).toHaveBeenCalledWith('sync');
  });
});
