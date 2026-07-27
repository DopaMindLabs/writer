import type { Meta, StoryObj } from '@storybook/react-vite';
import { asDeviceId } from 'writer-sync/core';
import { PairDeviceDialogBody } from './PairDeviceDialogBody';
import type { PairingExchange } from './usePairingExchange';

const exchange = (overrides: Partial<PairingExchange> = {}): PairingExchange => ({
  phase: 'creating',
  offerPayload: null,
  sessionId: null,
  peer: null,
  acceptAnswer: () => undefined,
  confirm: () => undefined,
  ...overrides,
});

const PAYLOAD = 'eJwrSS0uUS9KLEjNyclXKMlIVUjOSC0qUShJLS7RS87PLShKLS4pSy0qBgB'.repeat(8);

const meta = {
  title: 'Pairing/PairDeviceDialogBody',
  component: PairDeviceDialogBody,
  args: { exchange: exchange() },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PairDeviceDialogBody>;

export default meta;
type Story = StoryObj<typeof meta>;

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

/** The gate: nothing proceeds until a human says the digits match. */
export const AwaitingConfirmation: Story = {
  args: {
    exchange: exchange({
      phase: 'awaiting-confirmation',
      peer: {
        deviceId: asDeviceId('cGVlci1kZXZpY2UtaWQwMA'),
        publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
        transcript: new Uint8Array([1, 2, 3]),
        verificationCode: '048213',
      },
    }),
  },
};

export const Complete: Story = { args: { exchange: exchange({ phase: 'complete' }) } };

/** The reason never reaches the copy — a pairing error must not echo peer text. */
export const Failed: Story = { args: { exchange: exchange({ phase: 'failed' }) } };
