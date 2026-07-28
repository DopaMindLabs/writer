import type { AccessScopeId } from '../core/providers.types';
import type { EncryptedSyncFrame } from './operation.types';
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
  /** The scopes this device can actually decrypt. */
  accessibleScopeIds: () => Promise<AccessScopeId[]>;
  send: (message: CatchUpMessage) => void;
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
  attachments?: AttachmentTransfer;
  /** New frames are in the journal and await the host's materialiser. */
  onFramesJournalled?: () => void;
  /** Diagnostics for a refused frame. One bad frame never fails a batch. */
  onRejectedFrame?: (frame: EncryptedSyncFrame, reason: unknown) => void;
}

export interface CatchUpExchange {
  /** Open the exchange by publishing what this device holds. */
  start: () => Promise<void>;
  /** Handle one decoded message from the peer. */
  receive: (message: CatchUpMessage) => Promise<void>;
}

const batched = <T>(items: readonly T[], size: number): T[][] =>
  items.length === 0
    ? [[]]
    : Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
        items.slice(index * size, index * size + size),
      );

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
  requests: readonly CatchUpRequest[],
): Promise<void> => {
  const accessible = new Set(await ports.accessibleScopeIds());
  const permitted = requests.filter((request) => accessible.has(request.accessScopeId));
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
  const batches = batched(replies, MAX_FRAMES_PER_MESSAGE);
  batches.forEach((frames, index) => {
    ports.send({
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'frames',
      frames,
      final: index === batches.length - 1,
    });
  });
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
      accessibleScopeIds: await ports.accessibleScopeIds(),
    }),
  });
};

/** Verify one inbound frame and journal it, or report why it was refused. */
const admit = async (options: {
  ports: CatchUpPorts;
  frame: EncryptedSyncFrame;
  accessible: ReadonlySet<AccessScopeId>;
}): Promise<boolean> => {
  const { ports, frame, accessible } = options;
  try {
    if (!accessible.has(frame.accessScopeId)) {
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
    const accessible = new Set(await ports.accessibleScopeIds());
    for (const frame of message.frames) {
      if (await admit({ ports, frame, accessible })) rememberNewest(taken, frame);
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
          return answer(ports, message.requests);
        case 'frames':
          return ingest(message);
        case 'ack':
          await Promise.all(message.acknowledgements.map(ports.recordPeerAcknowledgement));
          return;
        case 'attachment-offer':
        case 'attachment-request':
        case 'attachment-chunk':
          await ports.attachments?.receive(message);
          return;
      }
    },
  };
};
