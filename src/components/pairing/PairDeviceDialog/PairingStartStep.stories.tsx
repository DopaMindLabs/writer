import type { Meta, StoryObj } from '@storybook/react-vite';
import { PairingStartStep } from './PairingStartStep';

const meta = {
  title: 'Pairing/PairingStartStep',
  component: PairingStartStep,
  args: { onShow: () => undefined, onScan: () => undefined },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PairingStartStep>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One device shows, the other scans — and this is where each picks. */
export const Choice: Story = {};
