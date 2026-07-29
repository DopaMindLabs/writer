import {
  decodeRootTransferMessage,
  encodeRootTransferMessage,
  startRootTransfer,
  type AuthenticatedPeerParameters,
  type RootTransferPorts,
} from 'writer-sync/pairing';
import type { DataChannelLike } from 'writer-sync/providers/webrtc';
import type { DeviceId } from 'writer-sync/core';
import { appLogger } from '@/lib/appLogger';
import { deviceKeyVault, unwrapPairingRoot } from '@/lib/cloud/crypto/deviceKeyVault';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import { sealExistingRows } from '@/lib/cloud/setup';
import { deviceKeyProvider, saveDeviceKeyRing } from '@/lib/cloud/crypto/keyStore';
import { currentPrincipal } from './writerEntityMetadata';

/**
 * Writer's half of the root-secret handover: what this device can seal, and
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

export interface RootSecretHandoverOptions {
  /** What the pairing proved: the peer's ephemeral key and the transcript. */
  peer: AuthenticatedPeerParameters;
  /** This session's ephemeral private key, which the peer sealed to. */
  sessionPrivateKey: CryptoKey | null;
  /** This device's own identity, for deciding who creates an account. */
  deviceId: DeviceId;
  onError?: (error: unknown) => void;
}

/**
 * Take a root into use: store it, derive the ring, and seal what was written
 * before there was a key.
 *
 * The re-seal is what makes a pairing carry a device's existing writing. Rows
 * written while keyless are plaintext and never entered the journal — putting
 * them back through the middleware is what seals them and backfills the frames
 * a peer can be sent.
 */
const adoptRoot = async (root: Uint8Array, epoch: number): Promise<void> => {
  try {
    await deviceKeyVault.storeRootSecret(root, await currentPrincipal());
    await saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(root, epoch) });
  } finally {
    // The root exists in this process for as long as it takes to store and
    // derive, and no longer.
    root.fill(0);
  }
  await sealExistingRows();
};

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
  throw new TypeError('root secret transfer: a message carried no bytes');
};

export const rootSecretHandoverPorts = (
  options: RootSecretHandoverOptions,
): Omit<RootTransferPorts, 'send'> => ({
  // Read through the resolver rather than the vault: what matters is whether
  // this device can actually seal a row right now, not whether bytes are stored.
  holdsRoot: () => deviceKeyProvider.hasAnyKey(),

  wrapForPeer: async () => ({
    wrapper: await deviceKeyVault.wrapRootSecretForPairing({
      peerEphemeralPublicJwk: options.peer.peerEphemeralPublicJwk,
      principalId: await currentPrincipal(),
      transcript: options.peer.transcript,
    }),
    epoch: currentEpoch(),
  }),

  // Both devices are new: one of them has to create the account, and the ids
  // they exchanged decide which without another round trip. Both are running
  // this protocol and hear each other, so the one that defers is deferring to a
  // device that is certainly about to act.
  mintsFirst: () =>
    String(options.deviceId) > String(options.peer.deviceId),

  createRoot: () => adoptRoot(generateRootSecret(), DEFAULT_EPOCH),

  acceptWrapper: async ({ wrapper, epoch }) => {
    const { sessionPrivateKey } = options;
    if (sessionPrivateKey === null) {
      throw new Error('root secret transfer: this session minted no ephemeral key');
    }
    // Opening it is the check. The key and the AAD are both bound to the
    // transcript, so a wrapper from another session, another peer, or an
    // exchange that differed by a byte simply fails to decrypt.
    await adoptRoot(
      await unwrapPairingRoot(wrapper, sessionPrivateKey, options.peer.transcript),
      epoch,
    );
  },

  onError: options.onError,
});

/** What a fresh pairing leaves behind for the root to travel on. */
export interface SecretHandoverSession {
  peer: AuthenticatedPeerParameters;
  /** This session's ephemeral private key, which the peer sealed to. */
  sessionPrivateKey: CryptoKey | null;
  /** This device's own identity, for deciding who creates an account. */
  deviceId: DeviceId;
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

export interface RunRootSecretHandoverOptions {
  channel: DataChannelLike;
  session: SecretHandoverSession;
  /** Called once, when the root has moved or the deadline has passed. */
  onSettled: () => void;
}

export interface RunningRootSecretHandover {
  stop: () => void;
}

/**
 * Drive the handover over one channel, then get out of the way.
 *
 * The listener is removed on the way out. The caller hands this protocol a view
 * of the channel rather than the channel itself, so sync traffic never reaches
 * this decoder — but a peer that has not finished repeats `ready` until it hears
 * back, and detaching is what stops those late repeats being answered by a
 * conversation that is over.
 */
export const runRootSecretHandover = (
  options: RunRootSecretHandoverOptions,
): RunningRootSecretHandover => {
  const { channel, session, onSettled } = options;
  let done = false;

  const transfer = startRootTransfer({
    ...rootSecretHandoverPorts({
      peer: session.peer,
      sessionPrivateKey: session.sessionPrivateKey,
      deviceId: session.deviceId,
      onError: (error: unknown) => {
        appLogger.warn('root secret transfer failed', error);
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
      appLogger.warn('refused a message during root secret transfer', error);
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
