import type { Meta, StoryObj } from '@storybook/react-vite';
import { InitiatorPairingView } from './InitiatorPairingView';
import { fixtureExchange } from './pairingExchange.fixture';

const PAYLOAD = 'eJwrSS0uUS9KLEjNyclXKMlIVUjOSC0qUShJLS7RS87PLShKLS4pSy0qBgB'.repeat(8);

const meta = {
  title: 'Pairing/InitiatorPairingView',
  component: InitiatorPairingView,
  args: {
    exchange: fixtureExchange({
      phase: 'awaiting-peer',
      offerPayload: PAYLOAD,
      sessionId: 'c2Vzc2lvbi1pZC0xMjM0',
    }),
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof InitiatorPairingView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Code up, scanner ready: both halves of the wait on screen together. */
export const Rest: Story = {};
