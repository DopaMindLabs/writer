import type { Meta, StoryObj } from '@storybook/react-vite';
import { PairingReplyCode } from './PairingReplyCode';

const PAYLOAD = 'eJwrSS0uUS9KLEjNyclXKMlIVUjOSC0qUShJLS7RS87PLShKLS4pSy0qBgB'.repeat(8);

const meta = {
  title: 'Pairing/PairingReplyCode',
  component: PairingReplyCode,
  args: {
    payload: PAYLOAD,
    sessionId: 'c2Vzc2lvbi1pZC0xMjM0',
    onHandOver: () => undefined,
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PairingReplyCode>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The reply, once it has been asked for: one code, and one way on from it. */
export const Revealed: Story = {};
