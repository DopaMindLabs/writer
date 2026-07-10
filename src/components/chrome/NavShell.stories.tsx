import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleSpace } from '@/test/fixtures';
import { TabHeader } from '@/components/settings/TabHeader';
import { NavShell } from './NavShell';
import type { NavTabGroup } from './NavTabs';

const groups: NavTabGroup[] = [
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
  title: 'Chrome/NavShell',
  component: NavShell,
  parameters: { layout: 'fullscreen', seed: 'multipleSpaces' },
  args: {
    variant: 'global',
    groups,
    active: 'sync',
    onSelect: () => undefined,
    children: null,
  },
} satisfies Meta<typeof NavShell>;

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
          <NavShell
            variant="global"
            groups={groups}
            active={active}
            onSelect={setActive}
          >
            <Body />
          </NavShell>
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
          <NavShell
            variant="space"
            groups={groups}
            active={active}
            onSelect={setActive}
            space={sampleSpace}
            activeSpaceId={sampleSpace.id}
          >
            <Body />
          </NavShell>
        </div>
      );
    };
    return <Demo />;
  },
};
