import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { NavTabs, type NavTabGroup } from './NavTabs';

const groups: NavTabGroup[] = [
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
  title: 'Chrome/NavTabs',
  component: NavTabs,
  parameters: { layout: 'padded' },
  args: { groups, active: 'general', onSelect: () => undefined },
} satisfies Meta<typeof NavTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const Demo = () => {
      const [active, setActive] = useState('general');
      return (
        <div className="flex w-[240px] flex-col border-r border-rule bg-paper-2">
          <NavTabs groups={groups} active={active} onSelect={setActive} />
        </div>
      );
    };
    return <Demo />;
  },
};
