import type { Meta, StoryObj } from '@storybook/react-vite';
import { PairDeviceDialogBody } from './PairDeviceDialogBody';
import { fixtureExchange as exchange, fixturePeer } from './pairingExchange.fixture';

const PAYLOAD = 'eJwrSS0uUS9KLEjNyclXKMlIVUjOSC0qUShJLS7RS87PLShKLS4pSy0qBgB'.repeat(8);

const PEER = fixturePeer();

const meta = {
  title: 'Pairing/PairDeviceDialogBody',
  component: PairDeviceDialogBody,
  args: { exchange: exchange() },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PairDeviceDialogBody>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The opening question: neither device can work out its role unaided. */
export const Choosing: Story = {
  args: { exchange: exchange({ phase: 'choosing', role: null }) },
};

/** Gathering local candidates before a code can be shown. */
export const Gathering: Story = {};

/** The code is up, and this device is watching for the reply. */
export const AwaitingPeer: Story = {
  args: {
    exchange: exchange({
      phase: 'awaiting-peer',
      offerPayload: PAYLOAD,
      sessionId: 'c2Vzc2lvbi1pZC0xMjM0',
    }),
  },
};

export const Authenticating: Story = {
  args: { exchange: exchange({ phase: 'authenticating' }) },
};

/** The reading device before it has seen anything. */
export const AwaitingOffer: Story = {
  args: { exchange: exchange({ phase: 'awaiting-offer', role: 'joiner' }) },
};

/** The reading device: reply and gate together, because its peer needs both. */
export const JoinerAwaitingConfirmation: Story = {
  args: {
    exchange: exchange({
      phase: 'awaiting-confirmation',
      role: 'joiner',
      answerPayload: PAYLOAD,
      sessionId: 'c2Vzc2lvbi1pZC0xMjM0',
      peer: PEER,
    }),
  },
};

/** The gate: nothing proceeds until a human says the digits match. */
export const AwaitingConfirmation: Story = {
  args: {
    exchange: exchange({
      phase: 'awaiting-confirmation',
      peer: PEER,
    }),
  },
};

export const Complete: Story = { args: { exchange: exchange({ phase: 'complete' }) } };

/** The reason never reaches the copy — a pairing error must not echo peer text. */
export const Failed: Story = { args: { exchange: exchange({ phase: 'failed' }) } };
