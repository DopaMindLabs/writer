import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { seedMultipleSpaces, sampleSpace } from '@/test/fixtures';
import { SettingsShell } from './SettingsShell';
import type { SettingsTabGroup } from './SettingsTabs';

const groups: SettingsTabGroup[] = [
  {
    label: 'Preferences',
    tabs: [
      { id: 'general', label: 'General' },
      { id: 'appearance', label: 'Appearance' },
    ],
  },
  {
    label: 'Data',
    tabs: [{ id: 'sync', label: 'Sync' }],
  },
];

const renderShell = (
  props: Partial<React.ComponentProps<typeof SettingsShell>> = {},
) =>
  renderWithProviders(
    <SettingsShell
      variant="global"
      groups={groups}
      active="general"
      onSelect={() => undefined}
      {...props}
    >
      <div data-testid="shell-body">Body content</div>
    </SettingsShell>,
  );

describe('SettingsShell', () => {
  it('renders the global header and child body', async () => {
    await seedMultipleSpaces();
    renderShell();
    expect(screen.getByText('LIpsum Writer')).toBeInTheDocument();
    expect(screen.getByTestId('shell-body')).toHaveTextContent('Body content');
  });

  it('renders the space header from the supplied space in the space variant', async () => {
    await seedMultipleSpaces();
    renderShell({
      variant: 'space',
      space: sampleSpace,
      activeSpaceId: sampleSpace.id,
    });
    expect(screen.getByText(sampleSpace.name)).toBeInTheDocument();
    expect(screen.getByText(sampleSpace.tag)).toBeInTheDocument();
  });

  it('forwards tab selection through onSelect', async () => {
    await seedMultipleSpaces();
    const onSelect = vi.fn();
    renderShell({ onSelect });
    await userEvent.click(screen.getByTestId('settings-tab-appearance'));
    expect(onSelect).toHaveBeenCalledWith('appearance');
  });

  describe('snapshot', () => {
    it('should match the snapshot across global and space variants', async () => {
      await seedMultipleSpaces();
      const { container } = renderWithProviders(
        <div>
          <SettingsShell
            variant="global"
            groups={groups}
            active="general"
            onSelect={() => undefined}
          >
            <div>Global body</div>
          </SettingsShell>
          <SettingsShell
            variant="space"
            groups={groups}
            active="sync"
            onSelect={() => undefined}
            space={sampleSpace}
            activeSpaceId={sampleSpace.id}
          >
            <div>Space body</div>
          </SettingsShell>
        </div>,
      );
      await screen.findAllByText('LIpsum Writer');
      expect(container).toMatchSnapshot();
    });
  });
});
