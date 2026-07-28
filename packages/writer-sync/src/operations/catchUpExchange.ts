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
  /** Record how far the peer has read — the input to journal compaction. */
  recordPeerAcknowledgement: (acknowledgement: OperationAcknowledgement) => Promise<void>;
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

/** The newest operation taken from each scope and origin in one reply. */
const acknowledgementsFor = (
  frames: readonly EncryptedSyncFrame[],
): OperationAcknowledgement[] => {
  const newest = new Map<string, EncryptedSyncFrame>();
  for (const frame of frames) {
    const key = `${frame.accessScopeId} ${String(frame.deviceId)}`;
    const held = newest.get(key);
    if (held === undefined || compareOperations(frame, held) > 0) newest.set(key, frame);
  }
  return [...newest.values()].map((frame) => ({
    accessScopeId: frame.accessScopeId,
    originDeviceId: frame.deviceId,
    operationId: frame.operationId,
  }));
};

/** Everything this device holds in the scopes it can decrypt. */
const heldFrames = async (ports: CatchUpPorts): Promise<EncryptedSyncFrame[]> => {
  const scopes = await ports.accessibleScopeIds();
  const perScope = await Promise.all(scopes.map((scope) => ports.journal.forScope(scope)));
  return perScope.flat();
};

const localManifests = async (ports: CatchUpPorts): Promise<ScopeManifest[]> =>
  buildScopeManifests(await heldFrames(ports));

/** Reply to a peer's requests, batched so no message outgrows the channel. */
const answer = async (
  ports: CatchUpPorts,
  requests: readonly CatchUpRequest[],
): Promise<void> => {
  const accessible = new Set(await ports.accessibleScopeIds());
  const held = await heldFrames(ports);
  const replies = requests
    .filter((request) => accessible.has(request.accessScopeId))
    .flatMap((request) => framesForRequest(held, request));

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
  let taken: EncryptedSyncFrame[] = [];

  return async (message) => {
    const accessible = new Set(await ports.accessibleScopeIds());
    for (const frame of message.frames) {
      if (await admit({ ports, frame, accessible })) taken.push(frame);
    }
    if (message.frames.length > 0) ports.onFramesJournalled?.();
    if (!message.final) return;

    const acknowledgements = acknowledgementsFor(taken);
    taken = [];
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
      }
    },
  };
};
