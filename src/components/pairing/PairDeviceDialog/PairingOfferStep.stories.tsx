import type { Meta, StoryObj } from '@storybook/react-vite';
import { PairingOfferStep } from './PairingOfferStep';
import { fixtureExchange as exchange } from './pairingExchange.fixture';

const PAYLOAD = 'eJwrSS0uUS9KLEjNyclXKMlIVUjOSC0qUShJLS7RS87PLShKLS4pSy0qBgB'.repeat(8);

const gathered = exchange({
  phase: 'awaiting-peer',
  offerPayload: PAYLOAD,
  sessionId: 'c2Vzc2lvbi1pZC0xMjM0',
});

const meta = {
  title: 'Pairing/PairingOfferStep',
  component: PairingOfferStep,
  args: { exchange: gathered },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PairingOfferStep>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * How the dialog opens on both devices: a choice, and neither protocol surface
 * yet. The postures it leads to have their own stories — `PairingStartStep`,
 * `PairingOfferCode` and `PairingOfferScan`.
 */
export const Start: Story = {};

/** Still the choice while the device is gathering: nothing here needs a code. */
export const StartWhileGathering: Story = {
  args: { exchange: exchange() },
};
