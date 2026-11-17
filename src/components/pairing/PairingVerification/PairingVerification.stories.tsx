import type { Meta, StoryObj } from '@storybook/react-vite';
import { PairingVerification } from './PairingVerification';

const meta = {
  title: 'Pairing/PairingVerification',
  component: PairingVerification,
  args: { code: '048213', onConfirm: () => undefined },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PairingVerification>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The gate: key transfer waits behind an explicit human comparison. */
export const Rest: Story = {};

/** Leading zeros are significant — the code is six digits, not a number. */
export const LeadingZeros: Story = { args: { code: '000517' } };
