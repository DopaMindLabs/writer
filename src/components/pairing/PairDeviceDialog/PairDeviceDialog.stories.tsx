import type { Meta, StoryObj } from '@storybook/react-vite';
import { asDeviceId } from 'writer-sync/core';
import type { PairingOffer } from 'writer-sync/pairing';
import type { PairingSignaller } from '@/lib/writerSyncIntegration/createPairingSignaller';
import { PairDeviceDialog } from './PairDeviceDialog';

const SESSION = 'c2Vzc2lvbi1pZC0xMjM0';

const offer = (): PairingOffer => ({
  v: 1,
  sessionId: SESSION,
  kind: 'offer',
  deviceId: 'ZGV2aWNlLWlkLTAwMDA',
  identityJwk: { kty: 'EC', crv: 'P-256', x: 'x'.repeat(43), y: 'y'.repeat(43) },
  ephemeralJwk: { kty: 'EC', crv: 'P-256', x: 'a'.repeat(43), y: 'b'.repeat(43) },
  sdp: `v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n${'a=candidate:1 1 udp 2113937151 192.168.1.2 54321 typ host\r\n'.repeat(6)}`,
  nonce: 'bm9uY2UtMDAwMDAwMDA',
  expiresAt: 4_102_444_800_000,
  signature: 'c2lnbmF0dXJl'.repeat(6),
});

/** A peer session that never opens a channel; nothing here drives sync. */
const idlePeerSession = () => ({
  channel: () => null,
  onChannel: () => () => undefined,
  openChannel: () => new Promise<never>(() => undefined),
  createOffer: () => Promise.resolve(''),
  acceptOffer: () => Promise.resolve(''),
  acceptAnswer: () => Promise.resolve(),
  close: () => undefined,
});

const signaller = (): PairingSignaller => ({
  sessionId: SESSION,
  deviceId: asDeviceId('bG9jYWwtZGV2aWNlLTAw'),
  session: idlePeerSession(),
  adapter: {
    createOffer: () => Promise.resolve(offer()),
    acceptOffer: () => Promise.reject(new Error('not used')),
    acceptAnswer: () => Promise.reject(new Error('not used')),
    parameters: () => null,
    sessionPrivateKey: () => null,
  },
  close: () => undefined,
});

const meta = {
  title: 'Pairing/PairDeviceDialog',
  component: PairDeviceDialog,
  args: { open: true, onOpenChange: () => undefined },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PairDeviceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The code this device shows for the other one to read. */
export const ShowingCode: Story = {
  args: { createSignaller: () => Promise.resolve(signaller()) },
};

/** Gathering candidates — never an indefinite spinner in practice, since the
 * engine times gathering out into a typed local-connectivity failure. */
export const Gathering: Story = {
  args: { createSignaller: () => new Promise(() => undefined) },
};

/** The device could not prepare a code. The reason stays out of the copy. */
export const Failed: Story = {
  args: { createSignaller: () => Promise.reject(new Error('gathering stalled')) },
};
