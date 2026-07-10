import type { Meta, StoryObj } from '@storybook/react-vite';
import { DocInspector } from './DocInspector';

const meta = {
  title: 'Navigation/DocInspector',
  component: DocInspector,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="flex h-[480px] justify-end">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DocInspector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { docName: "The bell-keeper's last morning", docId: 'd1' },
};

export const EmptyName: Story = {
  args: { docName: '', docId: 'd1' },
};
