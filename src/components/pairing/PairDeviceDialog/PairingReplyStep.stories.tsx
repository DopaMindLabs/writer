import type { Meta, StoryObj } from '@storybook/react-vite';
import { PairingReplyStep } from './PairingReplyStep';
import { fixtureExchange as exchange, fixturePeer } from './pairingExchange.fixture';

const PAYLOAD = 'eJwrSS0uUS9KLEjNyclXKMlIVUjOSC0qUShJLS7RS87PLShKLS4pSy0qBgB'.repeat(8);

const meta = {
  title: 'Pairing/PairingReplyStep',
  component: PairingReplyStep,
  args: {
    exchange: exchange({
      phase: 'awaiting-confirmation',
      role: 'joiner',
      answerPayload: PAYLOAD,
      sessionId: 'c2Vzc2lvbi1pZC0xMjM0',
      peer: fixturePeer(),
    }),
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PairingReplyStep>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The reply, waiting to be asked for. This screen replaces the scanner the
 * instant a payload decodes, so the code stays behind a deliberate press rather
 * than appearing under a finger already moving. The screens it leads to have
 * their own stories — `PairingCodeDisplay` and `PairingVerification`.
 */
export const BeforeReveal: Story = {};
