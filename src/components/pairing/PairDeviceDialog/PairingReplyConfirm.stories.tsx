import type { Meta, StoryObj } from '@storybook/react-vite';
import { PairingReplyConfirm } from './PairingReplyConfirm';

const meta = {
  title: 'Pairing/PairingReplyConfirm',
  component: PairingReplyConfirm,
  args: { code: '048213', onConfirm: () => undefined, onShowCode: () => undefined },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PairingReplyConfirm>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The reading device's gate: the shared six-digit comparison, plus the way back
 * to a reply the other device may not have read yet.
 */
export const WithAWayBack: Story = {};
