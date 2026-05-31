import type { Meta, StoryObj } from '@storybook/react-vite';
import { MobileSplitFallback } from './MobileSplitFallback';

const meta = {
  title: 'Navigation/MobileSplitFallback',
  component: MobileSplitFallback,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof MobileSplitFallback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { spaceId: 's1', docId: 'd1' },
};
