import {
  JOURNAL_RETENTION_DEFAULT_DAYS,
  retentionCutoff,
  startCatchUpSession,
  type CatchUpPorts,
  type CatchUpSession,
} from 'writer-sync/operations';
import { createTrustedFrameVerifier, sameIdentityKey } from 'writer-sync/crypto';
import { PairingError, PairingErrorCode } from 'writer-sync/pairing';
import {
  CONTROL_CHANNEL,
  createWebRtcTransport,
  splitPairingChannel,
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
  type RootHandoverOutcome,
  type SecretHandoverSession,
  type RunningRootSecretHandover,
} from './rootSecretHandover';
import { createTrustedDeviceStore } from './trustedDeviceStore';
import { peerSessions } from './peerSessionRegistry';
import { getJournalRetentionDaysFor } from './journalRetentionPreference';
import { currentPrincipal } from './writerEntityMetadata';
import { recordPeerAcknowledgement } from './materialization/acknowledgeDeletions';
import { createWriterOperationStore } from './materialization/writerOperationStore';
import { createWriterFullState } from './materialization/writerFullState';
import { writerJournalDeps } from './materialization/writerJournalDeps';
import { sweepUnappliedFrames } from './materialization/frameIngestion';
import { createAttachmentChunkStore } from './attachmentChunkStore';

/**
 * Connects a paired peer session to Writer's app-lifetime sync process.
 * Verified frames enter the shared journal and materialisation sweep, preserving
 * idempotence when more than one provider delivers the same operation.
 */

/**
 * Returns the scopes available for catch-up from the retained journal. Reading
 * the journal includes deleted scopes whose surviving state is a tombstone.
 */
const accessibleScopeIds = async (db: LoremDB): Promise<string[]> => {
  if (!deviceKeyProvider.hasAnyKey()) return [];
  const scopes = await db.syncOperations.orderBy('accessScopeId').uniqueKeys();
  return scopes
    .map(String)
    .filter(
      (accessScopeId) =>
        deviceKeyProvider.keyFor({
          accessScopeId,
          table: 'spaces',
          primaryKey: accessScopeId,
          operation: 'read',
        }) !== null,
    );
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
   * Adopts a confirmed peer session. Trust is persisted only after root-secret
   * transfer succeeds; a known device presenting a different key is rejected.
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
  // root secret can read any scope it is offered. Answering from the scopes it
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
    recordPeerAcknowledgement({
      db,
      registry,
      acknowledgement: {
        // The peer on this connection is what has read up to here; the origin is
        // whose operations it read. Conflating the two would credit an
        // acknowledgement to the wrong device and let compaction drop frames that
        // peer never received.
        deviceId: peer.deviceId,
        accessScopeId: acknowledgement.accessScopeId,
        originDeviceId: acknowledgement.originDeviceId,
        operationId: acknowledgement.operationId,
      },
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
  // Storage refused a frame this device wanted. Named apart from a refusal
  // because it is this device's problem, not the peer's, and because the peer
  // is deliberately not told the frame landed.
  onUnstoredFrame: (frame, reason) => {
    appLogger.warn('could not store a frame from a peer', {
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

/** Runs `listener` once the channel reaches its writable state. */
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

/** Runs `listener` for the first available channel, including one already open. */
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

interface PairingPhaseOptions {
  channel: DataChannelLike;
  handover: SecretHandoverSession;
  track: (running: RunningRootSecretHandover) => void;
  /** The root secret crossed. Nothing before this point may be relied upon. */
  onHandedOver: (channel: DataChannelLike) => void;
  /** It ended any other way — expired, timed out, cancelled or failed. */
  onAborted: (outcome: RootHandoverOutcome) => void;
}

/**
 * Completes root-secret transfer before catch-up. The split channel buffers sync
 * messages until the receiving device can resolve its scopes and keys.
 */
const runPairingPhase = ({
  channel,
  handover,
  track,
  onHandedOver,
  onAborted,
}: PairingPhaseOptions): void => {
  const { rootTransfer, catchUp } = splitPairingChannel({
    channel,
    onOverflow: (protocol) => {
      appLogger.warn('a peer sent more than the pairing channel holds', { protocol });
    },
  });
  track(
    runRootSecretHandover({
      channel: rootTransfer,
      session: handover,
      onCompleted: () => {
        onHandedOver(catchUp);
      },
      // Everything else ends the pairing. This device once carried on past the
      // deadline regardless, on the grounds that syncing what both ends can
      // already read beats syncing nothing — defensible while trust was
      // recorded up front, and not now: it would vouch for a device on the
      // strength of a conversation that never reached an end.
      onAborted,
    }),
  );
};

/** Rejects a changed identity key before root-secret transfer begins. */
const refuseSubstitutedIdentity = async (options: {
  registry: TrustedDeviceRegistry;
  deviceId: DeviceId;
  publicIdentityJwk: JsonWebKey;
}): Promise<void> => {
  const existing = await options.registry.find(options.deviceId);
  if (existing === null) return;
  if (sameIdentityKey(existing.publicIdentityJwk, options.publicIdentityJwk)) return;
  throw new PairingError(
    PairingErrorCode.TrustedKeyMismatch,
    'the stored identity for this device does not match the key it presented',
  );
};

/** Persists the authenticated peer after root transfer, reactivating known identities. */
const commitTrust = async (
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

/** Adopts peer-opened scope channels after trust has been committed. */
const listenForScopeChannels = (
  peer: AdoptedPeer,
  exchangeOver: (channel: DataChannelLike) => void,
): void => {
  peer.session.onAnyChannel((channel) => {
    if (channel.label === CONTROL_CHANNEL) return;
    whenOpen(channel, () => {
      exchangeOver(channel);
    });
  });
};

/** Caches the stored retention window for the synchronous catch-up port. */
const trackRetentionDays = (db: LoremDB): (() => number) => {
  let days = JOURNAL_RETENTION_DEFAULT_DAYS;
  void getJournalRetentionDaysFor(db)
    .then((stored) => {
      days = stored;
    })
    .catch((error: unknown) => {
      appLogger.warn('reading the journal retention window failed', error);
    });
  return () => days;
};

/** Everything one `PeerCatchUp` holds, so its phases can be read on their own. */
interface PeerRuntime {
  db: LoremDB;
  registry: TrustedDeviceRegistry;
  retentionDays: () => number;
  sessions: Set<PeerSession>;
  exchanges: Set<CatchUpSession>;
  transfers: Set<RunningRootSecretHandover>;
}

const exchangeOverFor =
  (runtime: PeerRuntime, peer: AdoptedPeer) =>
  (channel: DataChannelLike): void => {
    const { db, registry, retentionDays, exchanges } = runtime;
    exchanges.add(
      startCatchUpSession({
        transport: createWebRtcTransport(channel),
        ports: catchUpPorts({ db, peer, registry, retentionDays }),
        onError: (error: unknown) => {
          appLogger.warn('peer catch-up failed', error);
        },
      }),
    );
  };

/** Let a pairing go without a trace, because it left none to clear up. */
const discard = (runtime: PeerRuntime, peer: AdoptedPeer): void => {
  runtime.sessions.delete(peer.session);
  peerSessions.remove(peer.session);
  peer.session.close();
};

/**
 * Grant sync authority: publish the session and take up the peer's scope
 * channels. Called once trust is committed, never before.
 */
const beginTrustedPhase = (
  runtime: PeerRuntime,
  peer: AdoptedPeer,
): ((channel: DataChannelLike) => void) => {
  const exchangeOver = exchangeOverFor(runtime, peer);
  peerSessions.add({ session: peer.session, deviceId: peer.deviceId });
  listenForScopeChannels(peer, exchangeOver);
  return exchangeOver;
};

/** The root crossed: commit, then sync. A commit that fails syncs nothing. */
const onHandedOver = async (
  runtime: PeerRuntime,
  peer: AdoptedPeer,
  channel: DataChannelLike,
): Promise<void> => {
  try {
    await commitTrust(runtime.registry, peer);
  } catch (error) {
    // Syncing without the record would refuse every frame it drew, one at a
    // time, over a connection that looked healthy.
    appLogger.warn('recording a paired device failed', error);
    discard(runtime, peer);
    return;
  }
  beginTrustedPhase(runtime, peer)(channel);
};

const adoptPeer = async (runtime: PeerRuntime, peer: AdoptedPeer): Promise<void> => {
  const { sessions, registry, transfers } = runtime;
  if (sessions.has(peer.session)) return;
  sessions.add(peer.session);
  const { secretHandover } = peer;
  // No key material behind it: a reconnection between devices that already
  // trust each other, with nothing to commit and nothing to wait for.
  if (secretHandover === undefined) {
    openChannelOnce(peer.session, beginTrustedPhase(runtime, peer));
    return;
  }
  try {
    await refuseSubstitutedIdentity({
      registry,
      deviceId: peer.deviceId,
      publicIdentityJwk: secretHandover.peer.publicIdentityJwk,
    });
  } catch (error) {
    discard(runtime, peer);
    throw error;
  }
  openChannelOnce(peer.session, (channel) => {
    runPairingPhase({
      channel,
      handover: secretHandover,
      track: (running) => transfers.add(running),
      onHandedOver: (catchUp) => {
        void onHandedOver(runtime, peer, catchUp);
      },
      onAborted: (outcome) => {
        appLogger.warn('a pairing ended without the root moving', {
          status: outcome.status,
        });
        discard(runtime, peer);
      },
    });
  });
};

export const createPeerCatchUp = (db: LoremDB): PeerCatchUp => {
  const runtime: PeerRuntime = {
    db,
    registry: createTrustedDeviceStore(db),
    retentionDays: trackRetentionDays(db),
    sessions: new Set<PeerSession>(),
    exchanges: new Set<CatchUpSession>(),
    transfers: new Set<RunningRootSecretHandover>(),
  };
  const { sessions, exchanges, transfers } = runtime;

  return {
    adopt: (peer) => adoptPeer(runtime, peer),
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
