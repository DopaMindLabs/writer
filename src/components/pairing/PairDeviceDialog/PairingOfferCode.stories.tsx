import type { Meta, StoryObj } from '@storybook/react-vite';
import { PairingOfferCode } from './PairingOfferCode';
import { fixtureExchange as exchange } from './pairingExchange.fixture';

const PAYLOAD = 'eJwrSS0uUS9KLEjNyclXKMlIVUjOSC0qUShJLS7RS87PLShKLS4pSy0qBgB'.repeat(8);

const meta = {
  title: 'Pairing/PairingOfferCode',
  component: PairingOfferCode,
  args: {
    exchange: exchange({
      phase: 'awaiting-peer',
      offerPayload: PAYLOAD,
      sessionId: 'c2Vzc2lvbi1pZC0xMjM0',
    }),
    onScanReply: () => undefined,
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PairingOfferCode>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One code, and one action for when the other device has read it. */
export const Showing: Story = {};

/** Chosen before gathering finished: the wait is named, not left blank. */
export const Gathering: Story = {
  args: { exchange: exchange() },
};
