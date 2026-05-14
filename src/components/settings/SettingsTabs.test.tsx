import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { SettingsTabs, type SettingsTabDef } from './SettingsTabs';

const tabs: SettingsTabDef[] = [
  { id: 'general', label: 'General' },
  { id: 'editor', label: 'Editor' },
  { id: 'sync', label: 'Sync' },
];

describe('SettingsTabs', () => {
  it('renders all tabs and marks the active one with aria-current', () => {
    renderWithProviders(
      <SettingsTabs tabs={tabs} active="editor" onSelect={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'General' })).not.toHaveAttribute(
      'aria-current',
    );
    expect(
      screen.getByRole('button', { name: 'Editor' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Sync' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('calls onSelect with the tab id when clicked', async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <SettingsTabs tabs={tabs} active="general" onSelect={onSelect} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sync' }));
    expect(onSelect).toHaveBeenCalledWith('sync');
  });
});
