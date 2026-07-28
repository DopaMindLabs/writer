import { fromBase64Url, toBase64Url } from '../crypto/base64url';
import type { AttachmentChunkManifest } from './operation.types';
import {
  assembleChunks,
  missingChunkIndices,
  verifyChunk,
} from './attachmentChunking';
import {
  CATCH_UP_PROTOCOL_VERSION,
  MAX_REQUESTED_CHUNKS,
  type AttachmentChunkPayload,
  type CatchUpMessage,
} from './catchUpMessage';

/**
 * Attachment chunk exchange over a peer session — step 7 of the catch-up
 * sequence in runbook §24, and the transfer half of `attachmentChunking.ts`,
 * which owns the integrity rules this module obeys.
 *
 * A device offers the manifests it can serve; the peer asks only for the chunks
 * it is missing and verifies each on arrival, so a transfer that drops halfway
 * resumes from the gap rather than restarting.
 *
 * **In-flight state is bounded.** A peer can offer more attachments than this
 * device will ever assemble at once; beyond the ceiling, offers are declined
 * rather than queued, because an unbounded map of half-assembled files is a
 * memory exhaustion primitive handed to whoever is on the other end.
 */

/**
 * The chunk size a transfer uses, chosen to fit the channel's frame ceiling.
 *
 * `MAX_CHUNK_BYTES` describes what a manifest may legally declare, not what a
 * data channel can carry: base64url inflates bytes by four thirds, and the frame
 * ceiling in `webRtcTransport.ts` is 256 KiB, so a full 1 MiB chunk would be
 * rejected by the transport before it ever reached a peer. 128 KiB encodes to
 * roughly 171 KiB and leaves room for the JSON envelope.
 */
export const TRANSFER_CHUNK_BYTES = 131_072;

/** How many attachments this device will assemble at once. */
export const MAX_INFLIGHT_ATTACHMENTS = 8;

export interface AttachmentTransferPorts {
  /** Which chunks of an attachment this device already holds. */
  heldChunkIndices: (attachmentId: string) => Promise<ReadonlySet<number>>;
  /** One chunk of an attachment this device can serve, or `undefined`. */
  readChunk: (options: {
    attachmentId: string;
    index: number;
  }) => Promise<Uint8Array | undefined>;
  /** Store content that has been assembled and verified whole. */
  saveAttachment: (options: { attachmentId: string; content: Uint8Array }) => Promise<void>;
  send: (message: CatchUpMessage) => void;
  /** Diagnostics for a refused offer or chunk. */
  onRejected?: (attachmentId: string, reason: unknown) => void;
}

export interface AttachmentTransfer {
  /** Offer what this device can serve. */
  offer: (manifests: readonly AttachmentChunkManifest[]) => void;
  /** Handle one attachment message from the peer. */
  receive: (message: CatchUpMessage) => Promise<void>;
}

interface InFlight {
  manifest: AttachmentChunkManifest;
  /** Chunks received from the peer during this transfer. */
  chunks: Map<number, Uint8Array>;
  /** Chunks this device already held when the offer arrived. */
  held: ReadonlySet<number>;
}

const requestFor = (options: {
  attachmentId: string;
  indices: readonly number[];
}): CatchUpMessage => ({
  v: CATCH_UP_PROTOCOL_VERSION,
  kind: 'attachment-request',
  attachmentId: options.attachmentId,
  indices: options.indices.slice(0, MAX_REQUESTED_CHUNKS),
});

type InFlightMap = Map<string, InFlight>;

interface TransferContext {
  ports: AttachmentTransferPorts;
  inFlight: InFlightMap;
}

/** Decide whether to accept an offered attachment, and ask for its gaps. */
const consider = async (
  context: TransferContext,
  manifest: AttachmentChunkManifest,
): Promise<void> => {
  const { ports, inFlight } = context;
  if (inFlight.has(manifest.attachmentId)) return;
  const have = await ports.heldChunkIndices(manifest.attachmentId);
  const missing = missingChunkIndices({ manifest, have });
  if (missing.length === 0) return;
  if (inFlight.size >= MAX_INFLIGHT_ATTACHMENTS) {
    ports.onRejected?.(
      manifest.attachmentId,
      new Error('too many attachments already in flight'),
    );
    return;
  }
  inFlight.set(manifest.attachmentId, { manifest, chunks: new Map(), held: have });
  ports.send(requestFor({ attachmentId: manifest.attachmentId, indices: missing }));
};

/** Send the chunks a peer asked for. */
const serve = async (
  ports: AttachmentTransferPorts,
  attachmentId: string,
  indices: readonly number[],
): Promise<void> => {
  for (const index of indices.slice(0, MAX_REQUESTED_CHUNKS)) {
    const bytes = await ports.readChunk({ attachmentId, index });
    // A chunk this device does not hold is simply not sent: the peer asked on
    // the strength of an offer, and silence is the honest answer to a gap.
    if (bytes === undefined) continue;
    ports.send({
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'attachment-chunk',
      chunk: { attachmentId, index, bytes: toBase64Url(bytes) },
    });
  }
};

/**
 * Assemble from what arrived *and* what this device already held.
 *
 * A resumed transfer receives only the gap, so assembling from the received
 * chunks alone could never complete — the chunks already on disk have to be read
 * back in. They are verified again on the way through: a chunk stored by an
 * earlier, abandoned transfer is not evidence of anything.
 */
const complete = async (
  ports: AttachmentTransferPorts,
  pending: InFlight,
): Promise<void> => {
  const { manifest } = pending;
  const chunks = new Map(pending.chunks);
  for (const index of pending.held) {
    if (chunks.has(index)) continue;
    const bytes = await ports.readChunk({ attachmentId: manifest.attachmentId, index });
    if (bytes === undefined) continue;
    await verifyChunk({ manifest, index, bytes });
    chunks.set(index, bytes);
  }
  const content = await assembleChunks({ manifest, chunks });
  await ports.saveAttachment({ attachmentId: manifest.attachmentId, content });
};

/** Verify and keep one inbound chunk, completing the transfer when it closes the gap. */
const take = async (
  context: TransferContext,
  chunk: AttachmentChunkPayload,
): Promise<void> => {
  const { ports, inFlight } = context;
  const pending = inFlight.get(chunk.attachmentId);
  // A chunk for something never offered and never requested is discarded: a peer
  // does not get to push files this device did not ask for.
  if (pending === undefined) return;
  try {
    const bytes = fromBase64Url(chunk.bytes);
    await verifyChunk({ manifest: pending.manifest, index: chunk.index, bytes });
    pending.chunks.set(chunk.index, bytes);
    const outstanding = missingChunkIndices({
      manifest: pending.manifest,
      have: new Set([...pending.held, ...pending.chunks.keys()]),
    });
    if (outstanding.length > 0) return;
    await complete(ports, pending);
    inFlight.delete(chunk.attachmentId);
  } catch (reason) {
    // The whole transfer is abandoned rather than partially kept: a chunk that
    // fails verification means the offer cannot be trusted as a whole.
    inFlight.delete(chunk.attachmentId);
    ports.onRejected?.(chunk.attachmentId, reason);
  }
};

export const createAttachmentTransfer = (
  ports: AttachmentTransferPorts,
): AttachmentTransfer => {
  const context: TransferContext = { ports, inFlight: new Map() };

  return {
    offer: (manifests) => {
      ports.send({
        v: CATCH_UP_PROTOCOL_VERSION,
        kind: 'attachment-offer',
        manifests: [...manifests],
      });
    },

    receive: async (message) => {
      switch (message.kind) {
        case 'attachment-offer':
          for (const manifest of message.manifests) await consider(context, manifest);
          return;
        case 'attachment-request':
          return serve(ports, message.attachmentId, message.indices);
        case 'attachment-chunk':
          return take(context, message.chunk);
        case 'manifest':
        case 'request':
        case 'frames':
        case 'ack':
          return;
      }
    },
  };
};
