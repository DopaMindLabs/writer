import {
  JOURNAL_RETENTION_DEFAULT_DAYS,
  retentionCutoff,
  startCatchUpSession,
  type CatchUpPorts,
  type CatchUpSession,
} from 'writer-sync/operations';
import { createTrustedFrameVerifier } from 'writer-sync/crypto';
import {
  CONTROL_CHANNEL,
  createWebRtcTransport,
  type DataChannelLike,
  type PeerSession,
} from 'writer-sync/providers/webrtc';
import {
  TrustedDeviceStatus,
  type DeviceId,
  type TrustedDeviceRegistry,
} from 'writer-sync/core';
import type { LoremDB } from '@/db/LoremDB';
import { appLogger } from '@/lib/appLogger';
import { deviceKeyProvider } from '@/lib/cloud/crypto/keyStore';
import {
  runRootSecretHandover,
  type SecretHandoverSession,
  type RunningRootSecretHandover,
} from './rootSecretHandover';
import { createTrustedDeviceStore } from './trustedDeviceStore';
import { peerSessions } from './peerSessionRegistry';
import { getJournalRetentionDaysFor } from './journalRetentionPreference';
import { currentPrincipal } from './writerEntityMetadata';
import { createWriterOperationStore } from './materialization/writerOperationStore';
import { createWriterFullState } from './materialization/writerFullState';
import { writerJournalDeps } from './materialization/writerJournalDeps';
import { sweepUnappliedFrames } from './materialization/frameIngestion';
import { createAttachmentChunkStore } from './attachmentChunkStore';

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

/** The scopes this device holds frames for — what it can advertise. */
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
  /**
   * What the root secret can be sealed with, and opened by, for this session.
   * Absent when a session is adopted without a fresh pairing behind it — a
   * reconnection between devices that already trust each other never sends a
   * root twice (`docs/pairing-protocol.md` §12).
   */
  secretHandover?: SecretHandoverSession;
}

export interface PeerCatchUp {
  /**
   * Take over a peer session once pairing has been confirmed. Catch-up starts
   * as soon as the session has a control channel — which for the answering
   * device is when its peer opens one, not when the exchange finished.
   *
   * Resolves once the peer is recorded in the trust registry. Rejects — with
   * the session closed and nothing exchanged — when recording is refused,
   * which happens when a known device id presents a different identity key.
   */
  adopt: (peer: AdoptedPeer) => Promise<void>;
  /** Close every adopted session. */
  stop: () => void;
}

interface CatchUpPortsOptions {
  db: LoremDB;
  peer: AdoptedPeer;
  registry: TrustedDeviceRegistry;
  /** This device's retention window, as it stood when catch-up was adopted. */
  retentionDays: () => number;
}

/**
 * What the exchange is allowed to reach: this device's journal, keys and
 * registry. Sending is the transport's, so the session supplies it.
 */
const catchUpPorts = ({
  db,
  peer,
  registry,
  retentionDays,
}: CatchUpPortsOptions): Omit<CatchUpPorts, 'send'> => ({
  journal: createWriterOperationStore(db),
  accessibleScopeIds: () => accessibleScopeIds(db),
  // Stage 1 derives one content key for every scope, so a device holding the
  // account key can read any scope it is offered. Answering from the scopes it
  // already holds would leave a freshly paired device — which holds none — asking
  // for nothing, and so never receiving the first scope that would let it ask.
  canAccessScope: () => deviceKeyProvider.hasAnyKey(),
  attachments: createAttachmentChunkStore(db),
  verifySignature: createTrustedFrameVerifier(registry),
  // A peer the journal cannot honestly answer is served the scope as it stands
  // now. Without this it would get the surviving tail of history and be told it
  // was caught up, which is the one wrong answer to that request.
  fullState: createWriterFullState({ db, ...writerJournalDeps }),
  retentionCutoff: () => retentionCutoff({ retentionDays: retentionDays(), now: Date.now() }),
  recordPeerAcknowledgement: (acknowledgement) =>
    registry.acknowledge({
      // The peer on this connection is what has read up to here; the origin is
      // whose operations it read. Conflating the two would credit an
      // acknowledgement to the wrong device and let compaction drop frames that
      // peer never received.
      deviceId: peer.deviceId,
      accessScopeId: acknowledgement.accessScopeId,
      originDeviceId: acknowledgement.originDeviceId,
      operationId: acknowledgement.operationId,
    }),
  // New frames are journalled, not applied: the shared sweep is what applies
  // them, and it is what makes double delivery harmless.
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
  onUndeliverableFrame: (frame, reason) => {
    appLogger.warn('a frame for the peer exceeds the transport ceiling', {
      operationId: frame.operationId,
      reason,
    });
  },
});

/**
 * Run `listener` once the channel can actually carry a message.
 *
 * A channel exists well before it is usable: the device that creates one holds
 * it in `connecting` while the connection is still forming, and writing to it
 * then throws. The answering device never sees that state — its channel arrives
 * already open — which is why sending too early failed on one side of a pairing
 * and not the other.
 */
const whenOpen = (channel: DataChannelLike, run: () => void): void => {
  if (channel.readyState === 'open') {
    run();
    return;
  }
  const onOpen = (): void => {
    channel.removeEventListener('open', onOpen);
    run();
  };
  channel.addEventListener('open', onOpen);
};

/**
 * Run `listener` for the first channel a session comes by, however it comes by
 * it, once it is open.
 *
 * A channel the session already holds is delivered *during* the subscription,
 * when no handle to unsubscribe with exists yet. Taking that case on its own
 * leaves the subscription for the case that needs one: the answering device,
 * whose channel its peer has still to open.
 */
const openChannelOnce = (
  session: PeerSession,
  listener: (channel: DataChannelLike) => void,
): void => {
  const deliver = (channel: DataChannelLike): void => {
    whenOpen(channel, () => {
      listener(channel);
    });
  };
  const existing = session.channel();
  if (existing !== null) {
    deliver(existing);
    return;
  }
  const unsubscribe = session.onChannel((channel) => {
    unsubscribe();
    deliver(channel);
  });
};

interface PeerChannelOptions {
  channel: DataChannelLike;
  peer: AdoptedPeer;
  startCatchUp: () => void;
  track: (running: RunningRootSecretHandover) => void;
}

/**
 * Hand over key material first, then sync.
 *
 * The two protocols share one channel and are read by different decoders, so
 * they take turns rather than interleave. Catch-up second is also the only order
 * that means anything: a device still waiting for a root can decrypt nothing, so
 * it would advertise no scopes and be told, wrongly, that it is caught up.
 */
const onPeerChannel = ({
  channel,
  peer,
  startCatchUp,
  track,
}: PeerChannelOptions): void => {
  const { secretHandover } = peer;
  if (secretHandover === undefined) {
    startCatchUp();
    return;
  }
  track(
    runRootSecretHandover({ channel, session: secretHandover, onSettled: startCatchUp }),
  );
};

/**
 * Remember the peer a confirmed pairing just authenticated.
 *
 * This is the record every later frame is checked against: the verifier tests a
 * signature against the identity key a pairing established, so a device with no
 * record has nothing to be verified against and everything it sends is refused.
 * It is also what the device list reads.
 *
 * An identity already known is refreshed, never rewritten: the registry
 * reactivates a revoked record only when the presented key is the stored one,
 * so a completed pairing undoes a removal while a peer presenting a different
 * key under a known id is refused — and that refusal must abort the adoption,
 * not be logged past (`registry.refreshTrust`).
 */
const rememberPeer = async (
  registry: TrustedDeviceRegistry,
  peer: AdoptedPeer,
): Promise<void> => {
  const { secretHandover } = peer;
  if (secretHandover === undefined) return;
  const now = Date.now();
  if ((await registry.find(peer.deviceId)) !== null) {
    await registry.refreshTrust({
      deviceId: peer.deviceId,
      publicIdentityJwk: secretHandover.peer.publicIdentityJwk,
      at: now,
    });
    return;
  }
  await registry.trust({
    deviceId: peer.deviceId,
    publicIdentityJwk: secretHandover.peer.publicIdentityJwk,
    principalId: await currentPrincipal(),
    addedAt: now,
    lastSessionAt: now,
    displayName: '',
    status: TrustedDeviceStatus.Active,
    acknowledgedOperations: {},
  });
};

interface ListenOptions {
  peer: AdoptedPeer;
  exchangeOver: (channel: DataChannelLike) => void;
  track: (running: RunningRootSecretHandover) => void;
}

/**
 * Take up every channel this connection carries.
 *
 * The control channel hands over key material first and syncs after. Every other
 * channel is a scope its peer opened — which is how this device receives work in
 * a scope it is not writing to itself, and so has never asked for a channel for.
 */
const listenToPeer = ({ peer, exchangeOver, track }: ListenOptions): void => {
  openChannelOnce(peer.session, (channel) => {
    onPeerChannel({
      channel,
      peer,
      startCatchUp: () => {
        exchangeOver(channel);
      },
      track,
    });
  });

  peer.session.onAnyChannel((channel) => {
    if (channel.label === CONTROL_CHANNEL) return;
    whenOpen(channel, () => {
      exchangeOver(channel);
    });
  });
};

export const createPeerCatchUp = (db: LoremDB): PeerCatchUp => {
  const registry = createTrustedDeviceStore(db);
  const sessions = new Set<PeerSession>();
  const exchanges = new Set<CatchUpSession>();
  const transfers = new Set<RunningRootSecretHandover>();
  // Read once and held, because the engine asks for the cutoff synchronously
  // while answering a request. Until the stored preference resolves this is the
  // same default a device that never changed it keeps.
  let days = JOURNAL_RETENTION_DEFAULT_DAYS;
  void getJournalRetentionDaysFor(db)
    .then((stored) => {
      days = stored;
    })
    .catch((error: unknown) => {
      appLogger.warn('reading the journal retention window failed', error);
    });

  const startOver = (peer: AdoptedPeer): void => {
    const exchangeOver = (channel: DataChannelLike): void => {
      exchanges.add(
        startCatchUpSession({
          transport: createWebRtcTransport(channel),
          ports: catchUpPorts({ db, peer, registry, retentionDays: () => days }),
          onError: (error: unknown) => {
            appLogger.warn('peer catch-up failed', error);
          },
        }),
      );
    };
    listenToPeer({ peer, exchangeOver, track: (running) => transfers.add(running) });
  };

  return {
    adopt: async (peer) => {
      if (sessions.has(peer.session)) return;
      sessions.add(peer.session);
      // Published for the P2P provider, which asks for a channel without knowing
      // anything about pairing.
      peerSessions.add({ session: peer.session, deviceId: peer.deviceId });
      // Trust is recorded before anything is exchanged: a frame arriving from a
      // device this one has no record of is refused, and the first frames can
      // arrive as soon as the channel is read. A refusal here is a refusal to
      // sync at all — carrying on would open an exchange whose every frame the
      // verifier then rejects, which is exactly the silent dead pairing this
      // path once produced.
      try {
        await rememberPeer(registry, peer);
      } catch (error) {
        sessions.delete(peer.session);
        peerSessions.remove(peer.session);
        peer.session.close();
        throw error;
      }
      startOver(peer);
    },
    stop: () => {
      for (const transfer of transfers) transfer.stop();
      transfers.clear();
      for (const exchange of exchanges) exchange.stop();
      exchanges.clear();
      for (const session of sessions) {
        peerSessions.remove(session);
        session.close();
      }
      sessions.clear();
    },
  };
};
