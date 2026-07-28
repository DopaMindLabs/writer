import type { Meta, StoryObj } from '@storybook/react-vite';
import { PairingOfferStep } from './PairingOfferStep';
import { fixtureExchange as exchange } from './pairingExchange.fixture';

const PAYLOAD = 'eJwrSS0uUS9KLEjNyclXKMlIVUjOSC0qUShJLS7RS87PLShKLS4pSy0qBgB'.repeat(8);

const showing = exchange({
  phase: 'awaiting-peer',
  offerPayload: PAYLOAD,
  sessionId: 'c2Vzc2lvbi1pZC0xMjM0',
});

const meta = {
  title: 'Pairing/PairingOfferStep',
  component: PairingOfferStep,
  args: { exchange: showing },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PairingOfferStep>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The opening step, identical on both devices: one code, one way in. */
export const Showing: Story = {};

/** A device pointed at its own screen: named, with the scanner left open. */
export const OwnCodeScanned: Story = {
  args: { exchange: { ...showing, ownCodeScanned: true } },
};
