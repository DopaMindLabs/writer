import { startCatchUpSession, type CatchUpSession } from 'writer-sync/operations';
import { createTrustedFrameVerifier } from 'writer-sync/crypto';
import { createWebRtcTransport, type PeerSession } from 'writer-sync/providers/webrtc';
import type { DeviceId } from 'writer-sync/core';
import type { LoremDB } from '@/db/LoremDB';
import { appLogger } from '@/lib/appLogger';
import { deviceKeyProvider } from '@/lib/cloud/crypto/keyStore';
import { createTrustedDeviceStore } from './trustedDeviceStore';
import { createWriterOperationStore } from './materialization/writerOperationStore';
import { sweepUnappliedFrames } from './materialization/frameIngestion';

/**
 * Writer's wiring of the catch-up exchange onto a paired peer's connection.
 *
 * This exists because pairing and syncing have different lifetimes. The pairing
 * dialog owns a conversation that ends; sync needs a connection that persists.
 * Adopting the session here — from something mounted for the app's lifetime
 * rather than the dialog's — is what stops the connection dying the moment the
 * user dismisses "Devices paired".
 *
 * The exchange journals verified frames and nothing more; materialisation stays
 * with the inbox-guarded sweep every provider shares, so an operation arriving
 * by both P2P and Dexie still applies exactly once.
 */

/** The scopes this device holds a key for — the only ones it can ask for. */
const accessibleScopeIds = async (db: LoremDB): Promise<string[]> => {
  if (!deviceKeyProvider.hasAnyKey()) return [];
  const spaces = await db.spaces.toArray();
  return spaces
    .filter(
      (space) =>
        deviceKeyProvider.keyFor({
          accessScopeId: space.id,
          table: 'spaces',
          primaryKey: space.id,
          operation: 'read',
        }) !== null,
    )
    .map((space) => space.id);
};

export interface AdoptedPeer {
  session: PeerSession;
  /**
   * Which device is on the other end. An acknowledgement names the operations a
   * peer holds but never says who is speaking — that is the connection itself —
   * so the identity pairing authenticated has to be carried in.
   */
  deviceId: DeviceId;
}

export interface PeerCatchUp {
  /**
   * Take over a peer session once pairing has been confirmed. Catch-up starts
   * as soon as the session has a control channel — which for the answering
   * device is when its peer opens one, not when the exchange finished.
   */
  adopt: (peer: AdoptedPeer) => void;
  /** Close every adopted session. */
  stop: () => void;
}

export const createPeerCatchUp = (db: LoremDB): PeerCatchUp => {
  const registry = createTrustedDeviceStore(db);
  const verifySignature = createTrustedFrameVerifier(registry);
  const sessions = new Set<PeerSession>();
  const exchanges = new Set<CatchUpSession>();

  const startOver = (peer: AdoptedPeer): void => {
    const unsubscribe = peer.session.onChannel((channel) => {
      unsubscribe();
      exchanges.add(
        startCatchUpSession({
          transport: createWebRtcTransport(channel),
          ports: {
            journal: createWriterOperationStore(db),
            accessibleScopeIds: () => accessibleScopeIds(db),
            verifySignature,
            recordPeerAcknowledgement: (acknowledgement) =>
              registry.acknowledge({
                // The peer on this connection is what has read up to here; the
                // origin is whose operations it read. Conflating the two would
                // credit an acknowledgement to the wrong device and let
                // compaction drop frames that peer never received.
                deviceId: peer.deviceId,
                accessScopeId: acknowledgement.accessScopeId,
                originDeviceId: acknowledgement.originDeviceId,
                operationId: acknowledgement.operationId,
              }),
            // New frames are journalled, not applied: the shared sweep is what
            // applies them, and it is what makes double delivery harmless.
            onFramesJournalled: () => {
              void sweepUnappliedFrames(db).catch((error: unknown) => {
                appLogger.warn('materialising peer frames failed', error);
              });
            },
            onRejectedFrame: (frame, reason) => {
              appLogger.warn('refused a frame from a peer', {
                operationId: frame.operationId,
                reason,
              });
            },
          },
          onError: (error: unknown) => {
            appLogger.warn('peer catch-up failed', error);
          },
        }),
      );
    });
  };

  return {
    adopt: (peer) => {
      if (sessions.has(peer.session)) return;
      sessions.add(peer.session);
      startOver(peer);
    },
    stop: () => {
      for (const exchange of exchanges) exchange.stop();
      exchanges.clear();
      for (const session of sessions) session.close();
      sessions.clear();
    },
  };
};
