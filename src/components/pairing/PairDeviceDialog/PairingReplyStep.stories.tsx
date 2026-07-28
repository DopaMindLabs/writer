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
 * The reply, waiting to be handed back. The digits come next rather than
 * alongside: the other device cannot show its own until it has read this.
 */
export const HandingBack: Story = {};
