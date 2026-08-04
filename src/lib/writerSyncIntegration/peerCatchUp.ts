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

/**
 * The scopes this device holds frames for — what it can advertise.
 *
 * Read from the journal, not from the rows that survive. The two differ exactly
 * when it matters most: deleting a space removes every row it had and journals a
 * tombstone, so a device answering from its rows dropped the scope from its
 * manifest altogether and the peer was never told there was anything newer to
 * ask for. The deletion had no route across, and the peer kept the space.
 *
 * The journal is also what a request is served from, so this is the honest
 * answer to what can be offered — bounded, like all history here, by the
 * retention window.
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
   * Take over a peer session once pairing has been confirmed.
   *
   * Trust is committed in two phases. A fresh pairing is an in-memory identity
   * while the root secret moves — nothing written, no session published, no
   * scope channel, no catch-up — and is recorded only once the root has
   * crossed. An incomplete pairing therefore leaves nothing to clean up, so no
   * crash can strand a record. A rollback could not promise that: it is a
   * second write, across a conversation with another device.
   *
   * Resolves once the pairing phase is under way, not once trust exists.
   * Rejects, with nothing written, when a known device id presents a different
   * identity key.
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
 * The pairing phase: key material, and nothing else.
 *
 * The channel is split so this phase reads only the root transfer. The other
 * view is held unread until the root has crossed — a peer that confirmed first
 * and started syncing is buffered, not answered. Dropping it instead would cost
 * the exchange in that direction for the session, since a manifest is sent once.
 *
 * Catch-up second is also the only order that means anything: a device still
 * waiting for a root would advertise no scopes and be told it is caught up.
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

/**
 * Refuse a known device id presenting a different key, before any key material
 * moves. A read, not a write.
 *
 * The store enforces the same rule when trust is committed, and that refusal is
 * the authoritative one — but it comes after the root would already have been
 * sealed for whoever is on the other end.
 */
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

/**
 * Commit the peer a completed pairing authenticated — the record every later
 * frame is verified against, and what the device list reads.
 *
 * Runs only once the root secret has moved. A known identity is refreshed
 * rather than rewritten, so a completed pairing undoes a removal.
 */
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

/**
 * Take up the scope channels a peer opens — how this device receives work in a
 * scope it is not writing to itself.
 *
 * Subscribed only once trust is committed: a scope channel is ordinary sync
 * authority, and a pairing that has not finished has none.
 */
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

/**
 * The retention window, read once and held.
 *
 * The engine asks for the cutoff synchronously while answering a request, so it
 * cannot wait on storage. Until the stored preference resolves this is the same
 * default a device that never changed it keeps.
 */
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
