import type { AccessScopeId } from '../core/providers.types';
import type {
  AttachmentChunkManifest,
  EncryptedSyncFrame,
} from './operation.types';
import type { OperationStore } from './operationStore.types';
import { verifyFrame } from './operationCodec';
import { compareOperations } from './convergence';
import {
  CATCH_UP_PROTOCOL_VERSION,
  MAX_FRAMES_PER_MESSAGE,
  type CatchUpMessage,
  type OperationAcknowledgement,
} from './catchUpMessage';
import {
  buildScopeManifests,
  framesForRequest,
  planCatchUp,
  type CatchUpRequest,
  type ScopeManifest,
} from './scopeManifest';
import type { AttachmentTransfer } from './attachmentTransfer';
import { packFrames } from './catchUpBatching';

export interface CatchUpAttachments {
  /**
   * Bind attachment messages to this exchange's composed transport sends.
   *
   * Two of them: chunks are served against `sendWhenReady` so the holder moves
   * at the bearer's pace, while everything else is said immediately.
   */
  create: (sends: {
    send: (message: CatchUpMessage) => void;
    sendWhenReady?: (message: CatchUpMessage) => Promise<void>;
  }) => AttachmentTransfer;
  /** Complete attachment ciphertext available in the permitted scopes. */
  manifestsForScopes: (
    accessScopeIds: readonly AccessScopeId[],
  ) => Promise<AttachmentChunkManifest[]>;
}

/**
 * Runs initial and incremental catch-up symmetrically on both peers. Each peer
 * advertises a manifest, requests gaps, verifies inbound frames, journals them
 * and acknowledges progress. The host materialises accepted frames through its
 * shared inbox-guarded path.
 */

export interface CatchUpPorts {
  journal: OperationStore;
  /** The scopes this device holds frames for, and so can advertise. */
  accessibleScopeIds: () => Promise<AccessScopeId[]>;
  /** Whether this device has key authority for an offered scope. */
  canAccessScope?: (accessScopeId: AccessScopeId) => boolean;
  send: (message: CatchUpMessage) => void;
  /**
   * The transport's message ceiling, when it has one. Replies are packed so
   * no message outgrows it; absent, batching is by frame count alone.
   */
  maxMessageBytes?: number;
  /**
   * Write, resolving once the bearer has taken it. Absent for a bearer with no
   * pace of its own, in which case a sender simply writes.
   */
  sendWhenReady?: (message: CatchUpMessage) => Promise<void>;
  /** Verify the originating device's signature over the frame. */
  verifySignature: (frame: EncryptedSyncFrame) => Promise<boolean>;
  /**
   * Fresh `put` frames describing a scope as it stands now — signed, stamped and
   * ordinary in every respect. Served to a peer the journal can no longer honestly
   * answer. Absent when the host cannot rebuild state, in which case such a peer
   * gets whatever history survives.
   */
  fullState?: (accessScopeId: AccessScopeId) => Promise<EncryptedSyncFrame[]>;
  /**
   * The instant before which this device's journal has been compacted away.
   * A request reaching behind it cannot be answered from history.
   */
  retentionCutoff?: () => number;
  /** Record how far the peer has read — the input to journal compaction. */
  recordPeerAcknowledgement: (acknowledgement: OperationAcknowledgement) => Promise<void>;
  /**
   * Attachment chunk exchange — step 7 of the same catch-up sequence, so it
   * shares this conversation rather than opening a protocol of its own. Absent
   * when the host has no attachments to move.
   */
  attachments?: CatchUpAttachments;
  /** New frames are in the journal and await the host's materialiser. */
  onFramesJournalled?: () => void;
  /** Diagnostics for a refused frame. One bad frame never fails a batch. */
  onRejectedFrame?: (frame: EncryptedSyncFrame, reason: unknown) => void;
  /**
   * A frame this device accepted and could not store. Distinct from
   * {@link onRejectedFrame}: nothing is wrong with the frame, so the peer is not
   * told it landed and will offer it again — a reported gap, not a silent one.
   */
  onUnstoredFrame?: (frame: EncryptedSyncFrame, reason: unknown) => void;
  /**
   * An outbound frame no message can carry — too large for the transport even
   * alone. Deliberately distinct from {@link onRejectedFrame}, which is
   * inbound. The frame is skipped, the rest of the reply still travels, and
   * the peer's next manifest will show the gap and ask again — a reported
   * loop, not a dead exchange.
   */
  onUndeliverableFrame?: (frame: EncryptedSyncFrame, reason: unknown) => void;
}

export interface CatchUpExchange {
  /** Open the exchange by publishing what this device holds. */
  start: () => Promise<void>;
  /** Handle one decoded message from the peer. */
  receive: (message: CatchUpMessage) => Promise<void>;
}

const originKey = (frame: EncryptedSyncFrame): string =>
  `${frame.accessScopeId} ${String(frame.deviceId)}`;

/**
 * What one reply left behind for one scope and origin.
 *
 * An acknowledgement is read by the peer as "everything from this origin up to
 * here is held here", which is what lets it compact. That reading is only true
 * while nothing in between went missing, so a frame this device could not store
 * is remembered beside the newest it took.
 */
interface OriginProgress {
  newest?: EncryptedSyncFrame;
  /** The oldest frame this device failed to store, if any did. */
  missing?: EncryptedSyncFrame;
}

const progressFor = (
  progress: Map<string, OriginProgress>,
  frame: EncryptedSyncFrame,
): OriginProgress => {
  const held = progress.get(originKey(frame)) ?? {};
  progress.set(originKey(frame), held);
  return held;
};

/** Keeps the newest frame per scope and origin for a bounded acknowledgement. */
const rememberNewest = (
  progress: Map<string, OriginProgress>,
  frame: EncryptedSyncFrame,
): void => {
  const held = progressFor(progress, frame);
  if (held.newest === undefined || compareOperations(frame, held.newest) > 0) {
    held.newest = frame;
  }
};

/** Records a frame that arrived and could not be kept — a gap, not a refusal. */
const rememberMissing = (
  progress: Map<string, OriginProgress>,
  frame: EncryptedSyncFrame,
): void => {
  const held = progressFor(progress, frame);
  if (held.missing === undefined || compareOperations(frame, held.missing) < 0) {
    held.missing = frame;
  }
};

/**
 * The newest operation taken from each scope and origin in one reply, minus
 * every origin whose reply had a hole in it.
 *
 * Saying nothing for such an origin costs one round of compaction; saying the
 * newest would tell the peer it may drop a frame that never landed here, and
 * nothing would ever ask for it again.
 */
const acknowledgementsFor = (
  progress: ReadonlyMap<string, OriginProgress>,
): OperationAcknowledgement[] =>
  [...progress.values()]
    .filter(
      (held): held is OriginProgress & { newest: EncryptedSyncFrame } =>
        held.newest !== undefined &&
        (held.missing === undefined || compareOperations(held.newest, held.missing) < 0),
    )
    .map(({ newest }) => ({
      accessScopeId: newest.accessScopeId,
      originDeviceId: newest.deviceId,
      operationId: newest.operationId,
    }));

/**
 * Whether a scope may be read, by whichever rule the host supplies.
 *
 * Resolved once per exchange step rather than per scope, so a host that answers
 * from storage is not asked the same question repeatedly.
 */
const scopeAccessFor = async (
  ports: CatchUpPorts,
): Promise<(accessScopeId: AccessScopeId) => boolean> => {
  if (ports.canAccessScope !== undefined) return ports.canAccessScope;
  const accessible = new Set(await ports.accessibleScopeIds());
  return (accessScopeId) => accessible.has(accessScopeId);
};

const scopeFilterFor = async (
  ports: CatchUpPorts,
): Promise<(request: CatchUpRequest) => boolean> => {
  const canAccess = await scopeAccessFor(ports);
  return (request) => canAccess(request.accessScopeId);
};

/** Everything this device holds in the scopes it can decrypt. */
const heldFrames = async (ports: CatchUpPorts): Promise<EncryptedSyncFrame[]> => {
  const scopes = await ports.accessibleScopeIds();
  const perScope = await Promise.all(scopes.map((scope) => ports.journal.forScope(scope)));
  return perScope.flat();
};

const localManifests = async (ports: CatchUpPorts): Promise<ScopeManifest[]> =>
  buildScopeManifests(await heldFrames(ports));

/** Selects scopes that require current full state because retained history is incomplete. */
const scopesNeedingFullState = (
  ports: CatchUpPorts,
  requests: readonly CatchUpRequest[],
): Set<AccessScopeId> => {
  if (ports.fullState === undefined) return new Set();
  const cutoff = ports.retentionCutoff?.() ?? Number.NEGATIVE_INFINITY;
  return new Set(
    requests
      .filter((request) => request.after === undefined || request.after.millis <= cutoff)
      .map((request) => request.accessScopeId),
  );
};

/** Reply to a peer's requests, batched so no message outgrows the channel. */
const answer = async (
  ports: CatchUpPorts,
  attachments: AttachmentTransfer | undefined,
  requests: readonly CatchUpRequest[],
): Promise<void> => {
  const permitted = requests.filter(await scopeFilterFor(ports));
  const rebuild = scopesNeedingFullState(ports, permitted);
  const buildState = ports.fullState;

  const held = await heldFrames(ports);
  const fromJournal = permitted
    .filter((request) => !rebuild.has(request.accessScopeId))
    .flatMap((request) => framesForRequest(held, request));
  // Once per scope, however many origins asked for it: current state is not
  // per-origin, and sending it again per origin would multiply the transfer.
  const fromState =
    buildState === undefined
      ? []
      : (await Promise.all([...rebuild].map((scope) => buildState(scope)))).flat();

  const replies = [...fromState, ...fromJournal];
  const packed = packFrames({
    frames: replies,
    maxFrames: MAX_FRAMES_PER_MESSAGE,
    maxBytes: ports.maxMessageBytes,
  });
  // A frame no message can carry is skipped and reported, never attempted:
  // the transport would refuse it and the throw would take the rest of the
  // reply — and its final marker — down with it.
  for (const frame of packed.oversized) {
    ports.onUndeliverableFrame?.(frame, new UndeliverableFrameError(frame));
  }
  await sendReplies(ports, packed.batches);
  if (attachments === undefined || ports.attachments === undefined) return;
  const scopes = [...new Set(permitted.map((request) => request.accessScopeId))];
  const manifests = await ports.attachments.manifestsForScopes(scopes);
  if (manifests.length > 0) attachments.offer(manifests);
};

/** A frame whose lone-message encoding exceeds the transport's ceiling. */
export class UndeliverableFrameError extends Error {
  constructor(frame: EncryptedSyncFrame) {
    super(
      `catch-up: frame ${String(frame.operationId)} exceeds the transport's message ceiling`,
    );
    this.name = 'UndeliverableFrameError';
  }
}

/**
 * Sends every batch, then rethrows the first failure after the final marker.
 *
 * Paced against the bearer where one offers it. A reply is as large as the
 * history the peer asked for, and writing it straight out fills the outbox —
 * which is bounded, so the transport fails the session rather than growing.
 * The `fullState` path re-mints its reply on every attempt, so a reply that
 * overflowed once would overflow identically for ever: a scope large enough to
 * do it could never be paired against at all.
 */
const sendReplies = async (
  ports: CatchUpPorts,
  batches: readonly EncryptedSyncFrame[][],
): Promise<void> => {
  const paced = ports.sendWhenReady;
  let firstFailure: Error | undefined;
  for (const [index, frames] of batches.entries()) {
    const message = {
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'frames',
      frames,
      final: index === batches.length - 1,
    } as const;
    try {
      if (paced === undefined) ports.send(message);
      else await paced(message);
    } catch (error) {
      firstFailure = firstFailure ?? (error instanceof Error ? error : new Error(String(error)));
    }
  }
  if (firstFailure !== undefined) throw firstFailure;
};

/** Ask the peer for what its manifest shows this device is missing. */
const requestMissing = async (
  ports: CatchUpPorts,
  remote: readonly ScopeManifest[],
): Promise<void> => {
  ports.send({
    v: CATCH_UP_PROTOCOL_VERSION,
    kind: 'request',
    requests: planCatchUp({
      local: await localManifests(ports),
      remote,
      canAccessScope: await scopeAccessFor(ports),
    }),
  });
};

/**
 * How one inbound frame ended.
 *
 * `refused` and `unstored` are deliberately distinct. A refused frame is one
 * this device has decided is not authentic — nothing is owed for it. An unstored
 * frame is one it wanted and could not keep, which is a hole in what it holds
 * and must not be acknowledged over.
 */
type Admission = 'taken' | 'refused' | 'unstored';

/** Verify one inbound frame and journal it, or report why it was not kept. */
const admit = async (options: {
  ports: CatchUpPorts;
  frame: EncryptedSyncFrame;
  canAccess: (accessScopeId: AccessScopeId) => boolean;
}): Promise<Admission> => {
  const { ports, frame, canAccess } = options;
  let verified;
  try {
    if (!canAccess(frame.accessScopeId)) {
      throw new Error('frame names a scope this device has no key for');
    }
    verified = await verifyFrame(frame, { expectedScope: frame.accessScopeId });
    if (!(await ports.verifySignature(verified))) {
      throw new Error('frame signature did not verify');
    }
  } catch (reason) {
    ports.onRejectedFrame?.(frame, reason);
    return 'refused';
  }
  try {
    await ports.journal.append(verified);
    return 'taken';
  } catch (reason) {
    // Storage said no — a full disk, a closed database. The frame was wanted,
    // so the peer must keep it rather than be told it landed.
    ports.onUnstoredFrame?.(frame, reason);
    return 'unstored';
  }
};

/**
 * Take inbound frames, remembering what was taken across the batches of one
 * reply so a single acknowledgement can cover the whole of it.
 */
const createIngester = (
  ports: CatchUpPorts,
): ((message: { frames: readonly EncryptedSyncFrame[]; final: boolean }) => Promise<void>) => {
  let progress = new Map<string, OriginProgress>();

  return async (message) => {
    const canAccess = await scopeAccessFor(ports);
    for (const frame of message.frames) {
      const admission = await admit({ ports, frame, canAccess });
      if (admission === 'taken') rememberNewest(progress, frame);
      if (admission === 'unstored') rememberMissing(progress, frame);
    }
    if (message.frames.length > 0) ports.onFramesJournalled?.();
    if (!message.final) return;

    const acknowledgements = acknowledgementsFor(progress);
    progress = new Map();
    if (acknowledgements.length === 0) return;
    ports.send({ v: CATCH_UP_PROTOCOL_VERSION, kind: 'ack', acknowledgements });
  };
};

export const createCatchUpExchange = (ports: CatchUpPorts): CatchUpExchange => {
  const ingest = createIngester(ports);
  const attachments = ports.attachments?.create({
    send: ports.send,
    sendWhenReady: ports.sendWhenReady,
  });

  return {
    start: async () => {
      ports.send({
        v: CATCH_UP_PROTOCOL_VERSION,
        kind: 'manifest',
        manifests: await localManifests(ports),
      });
    },

    receive: async (message) => {
      switch (message.kind) {
        case 'manifest':
          return requestMissing(ports, message.manifests);
        case 'request':
          return answer(ports, attachments, message.requests);
        case 'frames':
          return ingest(message);
        case 'ack':
          await Promise.all(message.acknowledgements.map(ports.recordPeerAcknowledgement));
          return;
        case 'attachment-offer':
        case 'attachment-offer-next':
        case 'attachment-request':
        case 'attachment-chunk':
        case 'attachment-unavailable':
          await attachments?.receive(message);
          return;
      }
    },
  };
};
