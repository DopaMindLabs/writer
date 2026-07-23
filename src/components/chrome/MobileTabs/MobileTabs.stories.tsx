import type { Meta, StoryObj } from '@storybook/react-vite';
import { MobileTabs } from './MobileTabs';

const meta = {
  title: 'Navigation/MobileTabs',
  component: MobileTabs,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="w-[390px] border-x border-rule">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MobileTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithActiveDoc: Story = {
  args: { spaceId: 's1', docId: 'd1' },
};

export const SpaceLevel: Story = {
  args: { spaceId: 's1', docId: null },
};

export const NoSpace: Story = {
  args: { spaceId: null, docId: null },
};
