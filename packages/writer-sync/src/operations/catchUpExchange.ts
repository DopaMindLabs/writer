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
  /** Bind attachment messages to this exchange's composed transport send. */
  create: (send: (message: CatchUpMessage) => void) => AttachmentTransfer;
  /** Complete attachment ciphertext available in the permitted scopes. */
  manifestsForScopes: (
    accessScopeIds: readonly AccessScopeId[],
  ) => Promise<AttachmentChunkManifest[]>;
}

/**
 * The initial-transfer and incremental catch-up exchange, per runbook §24.
 *
 * Both peers run the same object: each opens with a manifest, each asks for what
 * it is missing, each answers what it is asked for, and each acknowledges what it
 * has taken. Symmetry is what makes reconnection the same code path as first
 * pairing — a returning device asks for a short tail rather than everything.
 *
 * **Journalling, not materialising.** A verified frame is appended to the
 * journal and nothing more. Materialisation stays with the host's existing
 * inbox-guarded path, which is what makes the same operation arriving by two
 * providers apply exactly once; duplicating that decision here would give the
 * same frame two ways to be applied. `onFramesJournalled` is the host's cue that
 * there is new work for it.
 *
 * **An authenticated peer is still untrusted.** Pairing proves which device is
 * speaking, not that it is honest or uncompromised, so every inbound frame is
 * re-verified — hash, scope, signature — and a frame naming a scope this device
 * has no key for is refused rather than journalled as ballast.
 */

export interface CatchUpPorts {
  journal: OperationStore;
  /** The scopes this device holds frames for, and so can advertise. */
  accessibleScopeIds: () => Promise<AccessScopeId[]>;
  /**
   * Whether this device could decrypt a scope it is being offered.
   *
   * Distinct from {@link accessibleScopeIds}, which answers what this device
   * *holds*. A device that has just been paired holds nothing at all, and if
   * "can I read this?" were answered from what it already has, it would ask for
   * nothing and so never receive the first scope — the state that would have let
   * it ask. Defaults to membership of the advertised list for a host whose key
   * material really is per scope.
   */
  canAccessScope?: (accessScopeId: AccessScopeId) => boolean;
  send: (message: CatchUpMessage) => void;
  /**
   * The transport's message ceiling, when it has one. Replies are packed so
   * no message outgrows it; absent, batching is by frame count alone.
   */
  maxMessageBytes?: number;
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
 * Remember a frame only if it is the newest yet taken from its scope and origin.
 *
 * Keeping the running maximum rather than every frame is what bounds this: an
 * acknowledgement names one operation per scope and origin, so the rest are never
 * needed — and a peer that streams batches without ever marking one final would
 * otherwise grow an unbounded list on this device.
 */
const rememberNewest = (
  newest: Map<string, EncryptedSyncFrame>,
  frame: EncryptedSyncFrame,
): void => {
  const held = newest.get(originKey(frame));
  if (held === undefined || compareOperations(frame, held) > 0) {
    newest.set(originKey(frame), frame);
  }
};

/** The newest operation taken from each scope and origin in one reply. */
const acknowledgementsFor = (
  newest: ReadonlyMap<string, EncryptedSyncFrame>,
): OperationAcknowledgement[] =>
  [...newest.values()].map((frame) => ({
    accessScopeId: frame.accessScopeId,
    originDeviceId: frame.deviceId,
    operationId: frame.operationId,
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

/**
 * The scopes this device must rebuild rather than replay.
 *
 * A request with no starting point is a peer that has never synchronised, and
 * one reaching behind the compaction cutoff is a peer that has been away too
 * long. Neither can be answered from history — the frames are simply gone — so
 * serving the journal's surviving tail would silently hand over a partial
 * account of the scope and call it caught up.
 */
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
  sendReplies(ports, packed.batches);
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
 * Send every batch, containing per-batch failures so the final marker still
 * goes out: a reply that dies mid-way leaves the peer holding frames it will
 * never acknowledge, and the same catch-up then re-runs on every connection.
 * The first failure is rethrown after the loop so the session still reports.
 */
const sendReplies = (
  ports: CatchUpPorts,
  batches: readonly EncryptedSyncFrame[][],
): void => {
  let firstFailure: Error | undefined;
  batches.forEach((frames, index) => {
    try {
      ports.send({
        v: CATCH_UP_PROTOCOL_VERSION,
        kind: 'frames',
        frames,
        final: index === batches.length - 1,
      });
    } catch (error) {
      firstFailure = firstFailure ?? (error instanceof Error ? error : new Error(String(error)));
    }
  });
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

/** Verify one inbound frame and journal it, or report why it was refused. */
const admit = async (options: {
  ports: CatchUpPorts;
  frame: EncryptedSyncFrame;
  canAccess: (accessScopeId: AccessScopeId) => boolean;
}): Promise<boolean> => {
  const { ports, frame, canAccess } = options;
  try {
    if (!canAccess(frame.accessScopeId)) {
      throw new Error('frame names a scope this device has no key for');
    }
    const verified = await verifyFrame(frame, { expectedScope: frame.accessScopeId });
    if (!(await ports.verifySignature(verified))) {
      throw new Error('frame signature did not verify');
    }
    await ports.journal.append(verified);
    return true;
  } catch (reason) {
    ports.onRejectedFrame?.(frame, reason);
    return false;
  }
};

/**
 * Take inbound frames, remembering what was taken across the batches of one
 * reply so a single acknowledgement can cover the whole of it.
 */
const createIngester = (
  ports: CatchUpPorts,
): ((message: { frames: readonly EncryptedSyncFrame[]; final: boolean }) => Promise<void>) => {
  let taken = new Map<string, EncryptedSyncFrame>();

  return async (message) => {
    const canAccess = await scopeAccessFor(ports);
    for (const frame of message.frames) {
      if (await admit({ ports, frame, canAccess })) rememberNewest(taken, frame);
    }
    if (message.frames.length > 0) ports.onFramesJournalled?.();
    if (!message.final) return;

    const acknowledgements = acknowledgementsFor(taken);
    taken = new Map();
    if (acknowledgements.length === 0) return;
    ports.send({ v: CATCH_UP_PROTOCOL_VERSION, kind: 'ack', acknowledgements });
  };
};

export const createCatchUpExchange = (ports: CatchUpPorts): CatchUpExchange => {
  const ingest = createIngester(ports);
  const attachments = ports.attachments?.create(ports.send);

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
        case 'attachment-request':
        case 'attachment-chunk':
          await attachments?.receive(message);
          return;
      }
    },
  };
};
