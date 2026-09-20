import type { Meta, StoryObj } from '@storybook/react-vite';
import { PairingCodeScanner } from './PairingCodeScanner';

const meta = {
  title: 'Pairing/PairingCodeScanner',
  component: PairingCodeScanner,
  args: { onPayload: () => undefined },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PairingCodeScanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The camera-free paths: upload a photo, or paste the payload text. Neither
 * needs a permission prompt, which is what keeps pairing usable when the camera
 * is declined, absent or unsupported.
 */
export const Rest: Story = {};
