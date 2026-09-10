import type { DeviceId } from 'writer-sync/core';
import { toBase64Url } from 'writer-sync/crypto';
import {
  createQrSignallingAdapter,
  createReplayCache,
  type QrSignallingAdapter,
} from 'writer-sync/pairing';
import {
  createPeerSession,
  type PeerConnectionLike,
  type PeerSession,
} from 'writer-sync/providers/webrtc';
import { deviceIdentityStore } from '@/lib/cloud/crypto/deviceIdentityStore';
import { createBrowserPeerConnection } from './browserPeerConnection';

/**
 * Writer's wiring of the pairing engine: this device's identity, a real peer
 * connection and the QR signalling adapter, assembled for one exchange.
 *
 * The replay cache is deliberately *not* per exchange. It is device-local by
 * specification (pairing protocol §14), so a nonce presented to a second attempt
 * must still be recognised — a fresh cache per dialog would let a photographed
 * code be replayed simply by reopening it.
 */

const SESSION_ID_BYTES = 16;

export interface PairingSignaller {
  adapter: QrSignallingAdapter;
  /**
   * This device's own identity. Exposed because a scanned payload decides which
   * half of the exchange this device runs, and that comparison needs both ids —
   * the peer's arrives in the payload, this one has to come from here.
   */
  deviceId: DeviceId;
  /** A session id for this exchange, minted by the initiator. */
  sessionId: string;
  /**
   * The live peer connection. Exposed so a confirmed pairing can hand it to
   * something that outlives the dialog: pairing is a conversation that ends,
   * sync is a connection that persists, and closing this on dismissal would end
   * both.
   */
  session: PeerSession;
  /** Tear the connection down. Safe to call more than once. */
  close: () => void;
}

export interface PairingSignallerOptions {
  /** Injected in tests; defaults to the browser's connection. */
  createConnection?: () => PeerConnectionLike;
}

const createSignallerFactory = () => {
  const replayCache = createReplayCache();

  return async (options: PairingSignallerOptions = {}): Promise<PairingSignaller> => {
    const identity = await deviceIdentityStore.load();
    const session = createPeerSession({
      createConnection: options.createConnection ?? createBrowserPeerConnection,
    });

    return {
      adapter: createQrSignallingAdapter({
        identity: identity.keys,
        peer: session,
        replayCache,
      }),
      deviceId: identity.deviceId,
      sessionId: toBase64Url(crypto.getRandomValues(new Uint8Array(SESSION_ID_BYTES))),
      session,
      close: () => {
        session.close();
      },
    };
  };
};

export const createPairingSignaller = createSignallerFactory();
