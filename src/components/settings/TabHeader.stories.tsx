import type { Meta, StoryObj } from '@storybook/react-vite';
import { TabHeader } from './TabHeader';

const meta = {
  title: 'Settings/TabHeader',
  component: TabHeader,
  parameters: { layout: 'padded' },
  args: {
    titleKey: 'settings.sync.title',
    subtitleKey: 'settings.sync.subtitle',
  },
} satisfies Meta<typeof TabHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Global: Story = {
  render: (args) => (
    <div className="max-w-[640px]">
      <TabHeader {...args} />
    </div>
  ),
};

export const SpaceScoped: Story = {
  render: (args) => (
    <div className="max-w-[640px]">
      <TabHeader
        {...args}
        titleKey="settings.space.sync.title"
        subtitleKey="settings.space.sync.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />
    </div>
  ),
};
