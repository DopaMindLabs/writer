import { fromBase64Url, toBase64Url } from '../crypto/base64url';
import type { AttachmentChunkManifest } from './operation.types';
import {
  assembleChunks,
  missingChunkIndices,
  verifyChunk,
} from './attachmentChunking';
import {
  CATCH_UP_PROTOCOL_VERSION,
  MAX_ATTACHMENT_OFFERS,
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

/** A peer has said it cannot serve a chunk this device is waiting on. */
export class StalledAttachmentTransferError extends Error {
  constructor(attachmentId: string, indices: readonly number[]) {
    super(
      `Attachment ${attachmentId} cannot complete: the peer holds none of chunk(s) ${indices.join(', ')}`,
    );
    this.name = 'StalledAttachmentTransferError';
  }
}

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
  /**
   * Persist one verified chunk the moment it arrives — the incremental storage
   * §10 of the frame protocol demands, and what `heldChunkIndices` reads on a
   * later transfer so an interrupted one resumes from the gap. Optional only
   * for a host that keeps no partial state and accepts restarting instead.
   */
  saveChunk?: (options: {
    attachmentId: string;
    index: number;
    bytes: Uint8Array;
  }) => Promise<void>;
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
  /** The page currently asked for, and not yet answered. */
  requested: Set<number>;
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

/** What this transfer still lacks, in order. */
const outstandingFor = (pending: InFlight): number[] =>
  missingChunkIndices({
    manifest: pending.manifest,
    have: new Set([...pending.held, ...pending.chunks.keys()]),
  });

/**
 * Ask for the next page, and only the next page.
 *
 * A request is bounded by the wire limit, so an attachment larger than one page
 * needs several — and asking again after every chunk would have the peer serve
 * the same indices over and over. The page in flight is remembered instead, and
 * the next is asked for once it has been answered.
 */
const requestNextPage = (options: {
  ports: AttachmentTransferPorts;
  pending: InFlight;
}): void => {
  const { ports, pending } = options;
  const page = outstandingFor(pending)
    .filter((index) => !pending.requested.has(index))
    .slice(0, MAX_REQUESTED_CHUNKS);
  if (page.length === 0) return;
  pending.requested = new Set(page);
  ports.send(requestFor({ attachmentId: pending.manifest.attachmentId, indices: page }));
};

/** Split a list into messages the peer's decoder will accept. */
const inPages = <T,>(items: readonly T[], size: number): T[][] => {
  const pages: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    pages.push(items.slice(start, start + size));
  }
  return pages;
};

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
  const pending: InFlight = {
    manifest,
    chunks: new Map(),
    held: have,
    requested: new Set(),
  };
  inFlight.set(manifest.attachmentId, pending);
  requestNextPage({ ports, pending });
};

/**
 * Send the chunks a peer asked for, and name the ones this device cannot.
 *
 * Silence is not an answer to a gap: the asking device waits on the page it
 * requested before asking for the next, so an unserved index it is never told
 * about stalls the transfer for as long as the session lasts.
 */
const serve = async (
  ports: AttachmentTransferPorts,
  attachmentId: string,
  indices: readonly number[],
): Promise<void> => {
  const unavailable: number[] = [];
  for (const index of indices.slice(0, MAX_REQUESTED_CHUNKS)) {
    const bytes = await ports.readChunk({ attachmentId, index });
    if (bytes === undefined) {
      unavailable.push(index);
      continue;
    }
    ports.send({
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'attachment-chunk',
      chunk: { attachmentId, index, bytes: toBase64Url(bytes) },
    });
  }
  if (unavailable.length === 0) return;
  ports.send({
    v: CATCH_UP_PROTOCOL_VERSION,
    kind: 'attachment-unavailable',
    attachmentId,
    indices: unavailable,
  });
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

/**
 * Give up on a transfer the peer has said it cannot finish.
 *
 * Dropped rather than kept waiting, so a later offer — from this peer once it
 * holds the chunk, or from another that does — starts it again.
 */
const abandon = (
  context: TransferContext,
  attachmentId: string,
  indices: readonly number[],
): void => {
  const { ports, inFlight } = context;
  if (!inFlight.delete(attachmentId)) return;
  ports.onRejected?.(attachmentId, new StalledAttachmentTransferError(attachmentId, indices));
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
    // Persisted only after verification: a stored chunk is later read back as
    // evidence of progress, and an unverified one would be forged progress.
    await ports.saveChunk?.({
      attachmentId: chunk.attachmentId,
      index: chunk.index,
      bytes,
    });
    pending.requested.delete(chunk.index);
    if (outstandingFor(pending).length === 0) {
      await complete(ports, pending);
      inFlight.delete(chunk.attachmentId);
      return;
    }
    // Only once the page in flight has been answered in full: asking per chunk
    // would have the peer serve indices it is already serving.
    if (pending.requested.size === 0) requestNextPage({ ports, pending });
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
      // Batched to the decoder's own bound: one oversized message is refused
      // whole, so a space with many images would offer nothing at all.
      for (const page of inPages(manifests, MAX_ATTACHMENT_OFFERS)) {
        ports.send({
          v: CATCH_UP_PROTOCOL_VERSION,
          kind: 'attachment-offer',
          manifests: page,
        });
      }
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
        case 'attachment-unavailable':
          abandon(context, message.attachmentId, message.indices);
          return;
        case 'manifest':
        case 'request':
        case 'frames':
        case 'ack':
          return;
      }
    },
  };
};
