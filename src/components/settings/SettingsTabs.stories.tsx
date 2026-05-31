import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SettingsTabs, type SettingsTabGroup } from './SettingsTabs';

const groups: SettingsTabGroup[] = [
  {
    label: 'Preferences',
    tabs: [
      { id: 'general', label: 'General' },
      { id: 'appearance', label: 'Appearance' },
      { id: 'typography', label: 'Typography' },
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
  title: 'Settings/SettingsTabs',
  component: SettingsTabs,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SettingsTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const Demo = () => {
      const [active, setActive] = useState('general');
      return (
        <div className="flex w-[240px] flex-col border-r border-rule bg-paper-2">
          <SettingsTabs groups={groups} active={active} onSelect={setActive} />
        </div>
      );
    };
    return <Demo />;
  },
};
