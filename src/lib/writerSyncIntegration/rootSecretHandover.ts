import {
  PairingError,
  PairingErrorCode,
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
 * Connects the provider-neutral root-transfer protocol to Writer's vault,
 * principal and key ring. Pairing and passphrase unlock converge on the same key
 * path.
 */

/**
 * The rotation epoch a device with no escrow derives at. It matches cloud
 * setup's own default, so a pair that later signs in agrees with the cloud
 * account rather than deriving a second, incompatible key.
 */
const DEFAULT_EPOCH = 1;

export interface RootSecretHandoverOptions {
  /** What the pairing proved: the peer's ephemeral key and the transcript. */
  peer: AuthenticatedPeerParameters;
  /** This session's ephemeral private key, which the peer sealed to. */
  sessionPrivateKey: CryptoKey | null;
  /** This device's own identity, for deciding who mints the root secret. */
  deviceId: DeviceId;
  /** This device's wall clock, injectable so expiry can be tested exactly. */
  now?: () => number;
  onError?: (error: unknown) => void;
}

/** Stores a root, derives its key ring and seals rows written before key setup. */
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
): Omit<RootTransferPorts, 'send'> => {
  const now = options.now ?? (() => Date.now());
  // Held here rather than read from the options, so expiry can let go of it.
  let sessionPrivateKey = options.sessionPrivateKey;

  /** Enforces the original pairing expiry immediately before root transfer. */
  const requireLiveSession = (): void => {
    if (now() < options.peer.expiresAt) return;
    sessionPrivateKey = null;
    throw new PairingError(
      PairingErrorCode.Expired,
      'the pairing session expired before the root secret moved',
    );
  };

  return {
    // Read through the resolver rather than the vault: what matters is whether
    // this device can actually seal a row right now, not whether bytes are stored.
    holdsRoot: () => deviceKeyProvider.hasAnyKey(),

    wrapForPeer: async () => {
      requireLiveSession();
      return {
        wrapper: await deviceKeyVault.wrapRootSecretForPairing({
          peerEphemeralPublicJwk: options.peer.peerEphemeralPublicJwk,
          principalId: await currentPrincipal(),
          transcript: options.peer.transcript,
        }),
        epoch: currentEpoch(),
      };
    },

    // Both devices are new: one of them has to mint the root secret, and the ids
    // they exchanged decide which without another round trip. Both are running
    // this protocol and hear each other, so the one that defers is deferring to a
    // device that is certainly about to act.
    mintsFirst: () => String(options.deviceId) > String(options.peer.deviceId),

    createRoot: () => adoptRoot(generateRootSecret(), DEFAULT_EPOCH),

    acceptWrapper: async ({ wrapper, epoch }) => {
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
  };
};

/** What a fresh pairing leaves behind for the root to travel on. */
export interface SecretHandoverSession {
  peer: AuthenticatedPeerParameters;
  /** This session's ephemeral private key, which the peer sealed to. */
  sessionPrivateKey: CryptoKey | null;
  /** This device's own identity, for deciding who mints the root secret. */
  deviceId: DeviceId;
  /**
   * The pairing ran past its deadline before the root could move.
   *
   * Told to whoever owns the exchange, because expiry is terminal there and
   * not here: the adapter's ephemeral key has to be let go, and the person
   * watching has to be told the pairing did not finish rather than left
   * looking at a success that transferred nothing.
   */
  onExpired?: () => void;
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

/** Distinguishes completed transfer from every terminal interruption. */
export type RootHandoverOutcome =
  | { status: 'completed' }
  | { status: 'expired' }
  | { status: 'timed-out' }
  | { status: 'cancelled' }
  | { status: 'failed'; error: unknown };

export interface RunRootSecretHandoverOptions {
  channel: DataChannelLike;
  session: SecretHandoverSession;
  /** This device's wall clock, injectable so expiry can be tested exactly. */
  now?: () => number;
  /** The key conversation succeeded. The only route to durable trust. */
  onCompleted: () => void;
  /** It ended any other way: write nothing, start nothing, close the pairing. */
  onAborted: (outcome: RootHandoverOutcome) => void;
}

export interface RunningRootSecretHandover {
  /** Teardown, reported to `onAborted` as `cancelled`. */
  stop: () => void;
}

/** What a transfer error means for the conversation as a whole. */
const outcomeFor = (error: unknown): RootHandoverOutcome =>
  error instanceof PairingError && error.code === PairingErrorCode.Expired
    ? { status: 'expired' }
    : { status: 'failed', error };

/** Runs root transfer on a channel view, detaches listeners and reports one outcome. */
export const runRootSecretHandover = (
  options: RunRootSecretHandoverOptions,
): RunningRootSecretHandover => {
  const { channel, session } = options;
  let done = false;

  const settle = (outcome: RootHandoverOutcome): void => {
    if (done) return;
    done = true;
    clearTimeout(deadline);
    transfer.stop();
    channel.removeEventListener('message', onMessage);
    if (outcome.status === 'completed') {
      options.onCompleted();
      return;
    }
    // The exchange is over and its key material with it; the adapter is told so
    // it can let the ephemeral key go.
    if (outcome.status === 'expired') session.onExpired?.();
    options.onAborted(outcome);
  };

  const transfer = startRootTransfer({
    ...rootSecretHandoverPorts({
      peer: session.peer,
      sessionPrivateKey: session.sessionPrivateKey,
      deviceId: session.deviceId,
      now: options.now,
      onError: (error: unknown) => {
        appLogger.warn('root secret transfer failed', error);
        // Nothing here is recoverable: an expired session can only repeat an
        // announcement no root can follow, and any other failure has left this
        // conversation without a conclusion. Waiting out the deadline would end
        // it the same way, later and less clearly.
        settle(outcomeFor(error));
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
      // interpret, and never reaches the user. Not terminal: a stray message
      // says nothing about the conversation this device is having.
      appLogger.warn('refused a message during root secret transfer', error);
    }
  };

  // A timer is never a conclusion. Even a device that sealed and sent a root
  // does not know the peer took it, so the deadline says only that the
  // conversation ran out — never that it succeeded.
  const deadline = setTimeout(() => {
    settle({ status: 'timed-out' });
  }, TRANSFER_DEADLINE_MILLIS);
  channel.addEventListener('message', onMessage);
  transfer.start();
  void transfer.settled().then(() => {
    settle({ status: 'completed' });
  });

  return {
    stop: () => {
      settle({ status: 'cancelled' });
    },
  };
};
