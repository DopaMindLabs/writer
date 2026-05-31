import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleSpace } from '@/test/fixtures';
import { SettingsShell } from './SettingsShell';
import { TabHeader } from './TabHeader';
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
    tabs: [
      { id: 'backups', label: 'Backups' },
      { id: 'sync', label: 'Sync' },
    ],
  },
];

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/SettingsShell',
  component: SettingsShell,
  parameters: { layout: 'fullscreen', seed: 'multipleSpaces' },
} satisfies Meta<typeof SettingsShell>;

export default meta;
type Story = StoryObj<typeof meta>;

const Body = () => (
  <>
    <TabHeader
      titleKey="settings.sync.title"
      subtitleKey="settings.sync.subtitle"
    />
    <p className="text-[13px] text-ink-2">Tab content renders here.</p>
  </>
);

export const Global: Story = {
  render: () => {
    const Demo = () => {
      const [active, setActive] = useState('sync');
      return (
        <div className="h-[600px]">
          <SettingsShell
            variant="global"
            groups={groups}
            active={active}
            onSelect={setActive}
          >
            <Body />
          </SettingsShell>
        </div>
      );
    };
    return <Demo />;
  },
};

export const SpaceScoped: Story = {
  parameters: { layout: 'fullscreen', seed: 'basicSpace' },
  render: () => {
    const Demo = () => {
      const [active, setActive] = useState('sync');
      return (
        <div className="h-[600px]">
          <SettingsShell
            variant="space"
            groups={groups}
            active={active}
            onSelect={setActive}
            space={sampleSpace}
            activeSpaceId={sampleSpace.id}
          >
            <Body />
          </SettingsShell>
        </div>
      );
    };
    return <Demo />;
  },
};
