import type { Meta, StoryObj } from '@storybook/react-vite';
import { PairingCodePager } from './PairingCodePager';

const meta = {
  title: 'Pairing/PairingCodePager',
  component: PairingCodePager,
  args: { index: 1, total: 3, onChange: () => undefined },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PairingCodePager>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Middle: Story = {};

/** Nothing before the first symbol, so stepping back is unavailable. */
export const First: Story = { args: { index: 0 } };

export const Last: Story = { args: { index: 2 } };
