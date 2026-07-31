import type { Meta, StoryObj } from '@storybook/react-vite';
import { PairingOfferScan } from './PairingOfferScan';
import { fixtureExchange as exchange } from './pairingExchange.fixture';

const scanning = exchange({ phase: 'awaiting-peer', sessionId: 'c2Vzc2lvbi1pZC0xMjM0' });

const meta = {
  title: 'Pairing/PairingOfferScan',
  component: PairingOfferScan,
  args: { exchange: scanning, onShowCode: () => undefined },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PairingOfferScan>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The way in that reads the other device, whichever half it is showing. */
export const Scanning: Story = {};

/** A device pointed at its own screen: named, with the scanner left open. */
export const OwnCodeScanned: Story = {
  args: { exchange: { ...scanning, ownCodeScanned: true } },
};
