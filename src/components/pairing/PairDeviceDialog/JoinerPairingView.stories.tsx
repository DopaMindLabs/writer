import type { Meta, StoryObj } from '@storybook/react-vite';
import { JoinerPairingView } from './JoinerPairingView';
import { fixtureExchange, fixturePeer } from './pairingExchange.fixture';

const PAYLOAD = 'eJwrSS0uUS9KLEjNyclXKMlIVUjOSC0qUShJLS7RS87PLShKLS4pSy0qBgB'.repeat(8);

const meta = {
  title: 'Pairing/JoinerPairingView',
  component: JoinerPairingView,
  args: { exchange: fixtureExchange({ phase: 'awaiting-offer', role: 'joiner' }) },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof JoinerPairingView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing of its own to show until it has read the peer's code. */
export const AwaitingOffer: Story = {};

/** Reply and gate together — the peer needs the reply to reach the gate at all. */
export const Answered: Story = {
  args: {
    exchange: fixtureExchange({
      phase: 'awaiting-confirmation',
      role: 'joiner',
      answerPayload: PAYLOAD,
      sessionId: 'c2Vzc2lvbi1pZC0xMjM0',
      peer: fixturePeer(),
    }),
  },
};
