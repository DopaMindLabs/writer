import {
  decodeRootTransferMessage,
  encodeRootTransferMessage,
  startRootTransfer,
  type AuthenticatedPeerParameters,
  type RootTransferPorts,
} from 'writer-sync/pairing';
import type { DataChannelLike } from 'writer-sync/providers/webrtc';
import { appLogger } from '@/lib/appLogger';
import { deviceKeyVault, unwrapPairingRoot } from '@/lib/cloud/crypto/deviceKeyVault';
import { deriveKeyRing } from '@/lib/cloud/crypto/keys';
import { deviceKeyProvider, saveDeviceKeyRing } from '@/lib/cloud/crypto/keyStore';
import { currentPrincipal } from './writerEntityMetadata';

/**
 * Writer's half of the account-root handover: what this device can seal, and
 * what it does with a root that arrives.
 *
 * The protocol in the package decides *whether* a root moves and in which
 * direction. This decides what a root means here — the vault it is stored in,
 * the principal it is bound to, and the key ring the rest of the application
 * reads. A device that receives one ends up exactly where a device that unlocked
 * by passphrase does; there is no separate "paired device" key path.
 */

/**
 * The rotation epoch a device with no escrow derives at. It matches cloud
 * setup's own default, so a pair that later signs in agrees with the account
 * rather than deriving a second, incompatible key.
 */
const DEFAULT_EPOCH = 1;

export interface AccountRootTransferOptions {
  /** What the pairing proved: the peer's ephemeral key and the transcript. */
  peer: AuthenticatedPeerParameters;
  /** This session's ephemeral private key, which the peer sealed to. */
  sessionPrivateKey: CryptoKey | null;
  onError?: (error: unknown) => void;
}

/**
 * The epoch this device's ring is at. A device holding a ring seals at the epoch
 * it actually derives with; one with a stored root but no cached ring has never
 * had a rotation applied, so the default is what its root was derived at.
 */
const currentEpoch = (): number => deviceKeyProvider.current()?.epoch ?? DEFAULT_EPOCH;

/** A channel delivers whatever the browser gave it; only bytes are a message. */
const asBytes = (data: unknown): Uint8Array => {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof data === 'string') return new TextEncoder().encode(data);
  throw new TypeError('account root transfer: a message carried no bytes');
};

export const accountRootTransferPorts = (
  options: AccountRootTransferOptions,
): Omit<RootTransferPorts, 'send'> => ({
  // Read through the resolver rather than the vault: what matters is whether
  // this device can actually seal a row right now, not whether bytes are stored.
  holdsRoot: () => deviceKeyProvider.hasAnyKey(),

  wrapForPeer: async () => ({
    wrapper: await deviceKeyVault.wrapAccountRootForPairing({
      peerEphemeralPublicJwk: options.peer.peerEphemeralPublicJwk,
      principalId: await currentPrincipal(),
      transcript: options.peer.transcript,
    }),
    epoch: currentEpoch(),
  }),

  acceptWrapper: async ({ wrapper, epoch }) => {
    const { sessionPrivateKey } = options;
    if (sessionPrivateKey === null) {
      throw new Error('account root transfer: this session minted no ephemeral key');
    }
    // Opening it is the check. The key and the AAD are both bound to the
    // transcript, so a wrapper from another session, another peer, or an
    // exchange that differed by a byte simply fails to decrypt.
    const root = await unwrapPairingRoot(wrapper, sessionPrivateKey, options.peer.transcript);
    try {
      await deviceKeyVault.storeAccountRoot(root, await currentPrincipal());
      await saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(root, epoch) });
    } finally {
      // The root exists in this process for as long as it takes to store and
      // derive, and no longer.
      root.fill(0);
    }
  },

  onError: options.onError,
});

/** What a fresh pairing leaves behind for the root to travel on. */
export interface KeyTransferSession {
  peer: AuthenticatedPeerParameters;
  /** This session's ephemeral private key, which the peer sealed to. */
  sessionPrivateKey: CryptoKey | null;
}

/**
 * How long to wait before syncing anyway.
 *
 * A peer that never announces is one this device cannot help and cannot be
 * helped by — an interrupted confirmation, or a build that does not speak this
 * protocol. Waiting forever would leave a confirmed pairing that never syncs at
 * all, which is worse than syncing whatever both ends can already read.
 */
export const TRANSFER_DEADLINE_MILLIS = 10_000;

export interface RunAccountRootTransferOptions {
  channel: DataChannelLike;
  session: KeyTransferSession;
  /** Called once, when the root has moved or the deadline has passed. */
  onSettled: () => void;
}

export interface RunningAccountRootTransfer {
  stop: () => void;
}

/**
 * Drive the handover over one channel, then get out of the way.
 *
 * The listener is removed on the way out because catch-up reads the same
 * channel next, with a decoder of its own: two protocols sharing a channel take
 * turns, and a listener left behind would report every sync message as an
 * unreadable root transfer.
 */
export const runAccountRootTransfer = (
  options: RunAccountRootTransferOptions,
): RunningAccountRootTransfer => {
  const { channel, session, onSettled } = options;
  let done = false;

  const transfer = startRootTransfer({
    ...accountRootTransferPorts({
      peer: session.peer,
      sessionPrivateKey: session.sessionPrivateKey,
      onError: (error: unknown) => {
        appLogger.warn('account root transfer failed', error);
      },
    }),
    send: (message) => {
      channel.send(encodeRootTransferMessage(message).buffer as ArrayBuffer);
    },
  });

  const onMessage = (event: MessageEvent<unknown>): void => {
    try {
      void transfer.receive(decodeRootTransferMessage(asBytes(event.data)));
    } catch (error) {
      // Anything that is not a root-transfer message is not this protocol's to
      // interpret, and never reaches the user.
      appLogger.warn('refused a message during account root transfer', error);
    }
  };

  const finish = (): void => {
    if (done) return;
    done = true;
    clearTimeout(deadline);
    transfer.stop();
    channel.removeEventListener('message', onMessage);
    onSettled();
  };

  const deadline = setTimeout(finish, TRANSFER_DEADLINE_MILLIS);
  channel.addEventListener('message', onMessage);
  transfer.start();
  void transfer.settled().then(finish);

  return { stop: finish };
};
