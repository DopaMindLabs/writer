import { describe, expect, it, vi } from 'vitest';
import { toBase64Url } from '../crypto/base64url';
import type { AttachmentChunkManifest } from './operation.types';
import { buildChunkManifest } from './attachmentChunking';
import { MAX_FRAME_BYTES } from '../providers/webrtc/webRtcTransport';
import {
  MAX_REQUESTED_CHUNKS,
  decodeCatchUpMessage,
  encodeCatchUpMessage,
  type CatchUpMessage,
} from './catchUpMessage';
import {
  AttachmentCursorError,
  MAX_INFLIGHT_ATTACHMENTS,
  MAX_OFFERS_PER_PAGE,
  StalledAttachmentTransferError,
  TRANSFER_CHUNK_BYTES,
  createAttachmentTransfer,
  type AttachmentTransferPorts,
} from './attachmentTransfer';

const CHUNK = 8;

const contentOf = (length: number): Uint8Array =>
  Uint8Array.from({ length }, (_unused, index) => index % 251);

const manifestFor = async (
  attachmentId: string,
  content: Uint8Array,
): Promise<AttachmentChunkManifest> =>
  buildChunkManifest({ attachmentId, content, chunkBytes: CHUNK });

const chunkOf = (content: Uint8Array, index: number): Uint8Array =>
  content.subarray(index * CHUNK, (index + 1) * CHUNK);

const harness = (options: {
  held?: (attachmentId: string) => Set<number>;
  serve?: Uint8Array;
} = {}) => {
  const sent: CatchUpMessage[] = [];
  const saved: { attachmentId: string; content: Uint8Array }[] = [];
  const savedChunks: { attachmentId: string; index: number; bytes: Uint8Array }[] = [];
  const rejected: { attachmentId: string; reason: unknown }[] = [];

  const ports: AttachmentTransferPorts = {
    heldChunkIndices: async (attachmentId) =>
      options.held?.(attachmentId) ?? new Set<number>(),
    readChunk: async ({ index }) => {
      if (options.serve === undefined) return undefined;
      const bytes = chunkOf(options.serve, index);
      // Past the end is an index this device does not hold, not an empty chunk.
      return bytes.length > 0 ? bytes : undefined;
    },
    saveAttachment: async ({ attachmentId, content }) => {
      saved.push({ attachmentId, content });
    },
    saveChunk: async ({ attachmentId, index, bytes }) => {
      savedChunks.push({ attachmentId, index, bytes });
    },
    send: (message) => sent.push(message),
    onRejected: (attachmentId, reason) => rejected.push({ attachmentId, reason }),
  };

  return { transfer: createAttachmentTransfer(ports), sent, saved, savedChunks, rejected };
};

const chunkMessage = (options: {
  attachmentId: string;
  index: number;
  bytes: Uint8Array;
}): CatchUpMessage => ({
  v: 1,
  kind: 'attachment-chunk',
  chunk: {
    attachmentId: options.attachmentId,
    index: options.index,
    bytes: toBase64Url(options.bytes),
  },
});

describe('TRANSFER_CHUNK_BYTES', () => {
  it('encodes inside the channel’s frame ceiling', () => {
    const bytes = new Uint8Array(TRANSFER_CHUNK_BYTES);
    const message = encodeCatchUpMessage({
      v: 1,
      kind: 'attachment-chunk',
      chunk: { attachmentId: 'a'.repeat(64), index: 4095, bytes: toBase64Url(bytes) },
    });

    expect(message.byteLength).toBeLessThan(MAX_FRAME_BYTES);
  });
});

describe('createAttachmentTransfer offer', () => {
  it('publishes what this device can serve', async () => {
    const { transfer, sent } = harness();
    const manifest = await manifestFor('att-1', contentOf(20));

    transfer.offer([manifest]);

    expect(sent).toEqual([{ v: 1, kind: 'attachment-offer', cursor: 0, manifests: [manifest] }]);
  });
});

describe('createAttachmentTransfer receiving an offer', () => {
  it('asks only for the chunks it is missing', async () => {
    const { transfer, sent } = harness({ held: () => new Set([0, 2]) });
    const manifest = await manifestFor('att-1', contentOf(24));

    await transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 0, manifests: [manifest] });

    expect(sent).toEqual([
      { v: 1, kind: 'attachment-request', attachmentId: 'att-1', indices: [1] },
    ]);
  });

  it('asks for no chunks when it already holds every one of them', async () => {
    const { transfer, sent } = harness({ held: () => new Set([0, 1, 2]) });
    const manifest = await manifestFor('att-1', contentOf(24));

    await transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 0, manifests: [manifest] });

    // Nothing to fetch, so nothing is asked for — but the page is settled, and
    // saying so is what brings the next one.
    expect(sent.filter((message) => message.kind === 'attachment-request')).toEqual([]);
    expect(sent).toEqual([{ v: 1, kind: 'attachment-offer-next', cursor: 1 }]);
  });

  it('does not re-request an attachment offered twice in one page', async () => {
    const { transfer, sent } = harness();
    const manifest = await manifestFor('att-1', contentOf(24));

    await transfer.receive({
      v: 1,
      kind: 'attachment-offer',
      cursor: 0,
      manifests: [manifest, manifest],
    });

    expect(sent).toHaveLength(1);
  });

  it('declines an offer beyond the in-flight ceiling instead of queueing it', async () => {
    const { transfer, sent, rejected } = harness();
    const manifests = await Promise.all(
      Array.from({ length: MAX_INFLIGHT_ATTACHMENTS + 1 }, (_unused, index) =>
        manifestFor(`att-${String(index)}`, contentOf(24)),
      ),
    );

    await transfer.receive({ v: 1, kind: 'attachment-offer',
      cursor: 0, manifests });

    expect(sent).toHaveLength(MAX_INFLIGHT_ATTACHMENTS);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.attachmentId).toBe(`att-${String(MAX_INFLIGHT_ATTACHMENTS)}`);
  });
});

describe('createAttachmentTransfer serving a request', () => {
  it('sends each requested chunk', async () => {
    const content = contentOf(24);
    const { transfer, sent } = harness({ serve: content });

    await transfer.receive({
      v: 1,
      kind: 'attachment-request',
      attachmentId: 'att-1',
      indices: [0, 2],
    });

    expect(sent).toEqual([
      chunkMessage({ attachmentId: 'att-1', index: 0, bytes: chunkOf(content, 0) }),
      chunkMessage({ attachmentId: 'att-1', index: 2, bytes: chunkOf(content, 2) }),
    ]);
  });

  it('says which chunks it does not hold rather than answering with silence', async () => {
    const { transfer, sent } = harness();

    await transfer.receive({
      v: 1,
      kind: 'attachment-request',
      attachmentId: 'att-1',
      indices: [0],
    });

    // The asking device waits on the page it requested before asking for the
    // next, so an unserved index it is never told about stalls the transfer.
    expect(sent).toEqual([
      { v: 1, kind: 'attachment-unavailable', attachmentId: 'att-1', indices: [0] },
    ]);
  });
});

describe('createAttachmentTransfer receiving chunks', () => {
  const deliverAll = async (
    transfer: ReturnType<typeof createAttachmentTransfer>,
    content: Uint8Array,
    manifest: AttachmentChunkManifest,
  ): Promise<void> => {
    for (let index = 0; index < manifest.chunkCount; index += 1) {
      await transfer.receive(
        chunkMessage({
          attachmentId: manifest.attachmentId,
          index,
          bytes: chunkOf(content, index),
        }),
      );
    }
  };

  it('assembles and saves once every chunk has arrived', async () => {
    const content = contentOf(20);
    const manifest = await manifestFor('att-1', content);
    const { transfer, saved } = harness();

    await transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 0, manifests: [manifest] });
    await deliverAll(transfer, content, manifest);

    expect(saved).toEqual([{ attachmentId: 'att-1', content }]);
  });

  it('persists each verified chunk as it arrives, not only the whole', async () => {
    // §10 demands incremental storage: an aborted transfer must leave its
    // verified chunks behind, or resuming has nothing to resume from and a
    // half-received file reserves an in-flight slot for nothing.
    const content = contentOf(20);
    const manifest = await manifestFor('att-1', content);
    const { transfer, savedChunks } = harness();

    await transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 0, manifests: [manifest] });
    await transfer.receive(
      chunkMessage({ attachmentId: 'att-1', index: 0, bytes: chunkOf(content, 0) }),
    );

    expect(savedChunks).toEqual([
      { attachmentId: 'att-1', index: 0, bytes: chunkOf(content, 0) },
    ]);
  });

  it('does not persist a chunk that failed verification', async () => {
    const content = contentOf(20);
    const manifest = await manifestFor('att-1', content);
    const { transfer, savedChunks, rejected } = harness();

    await transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 0, manifests: [manifest] });
    await transfer.receive(
      chunkMessage({ attachmentId: 'att-1', index: 0, bytes: contentOf(7) }),
    );

    expect(savedChunks).toEqual([]);
    expect(rejected).toHaveLength(1);
  });

  it('saves nothing until the transfer is complete', async () => {
    const content = contentOf(20);
    const manifest = await manifestFor('att-1', content);
    const { transfer, saved } = harness();

    await transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 0, manifests: [manifest] });
    await transfer.receive(
      chunkMessage({ attachmentId: 'att-1', index: 0, bytes: chunkOf(content, 0) }),
    );

    expect(saved).toEqual([]);
  });

  it('resumes from the gap, assembling with the chunks it already held', async () => {
    const content = contentOf(24);
    const manifest = await manifestFor('att-1', content);
    const { transfer, sent, saved } = harness({
      held: () => new Set([0, 1]),
      serve: content,
    });

    await transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 0, manifests: [manifest] });
    expect(sent).toEqual([
      { v: 1, kind: 'attachment-request', attachmentId: 'att-1', indices: [2] },
    ]);

    // Only the missing chunk is delivered; the held ones are never re-sent, so
    // assembly has to draw on what the device already had.
    await transfer.receive(
      chunkMessage({ attachmentId: 'att-1', index: 2, bytes: chunkOf(content, 2) }),
    );

    expect(saved).toEqual([{ attachmentId: 'att-1', content }]);
  });

  it('refuses to assemble when a chunk it held no longer verifies', async () => {
    const content = contentOf(24);
    const manifest = await manifestFor('att-1', content);
    const { transfer, saved, rejected } = harness({
      held: () => new Set([0, 1]),
      serve: contentOf(24).fill(7),
    });

    await transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 0, manifests: [manifest] });
    await transfer.receive(
      chunkMessage({ attachmentId: 'att-1', index: 2, bytes: chunkOf(content, 2) }),
    );

    expect(saved).toEqual([]);
    expect(rejected).toHaveLength(1);
  });

  it('abandons the transfer when a chunk fails verification', async () => {
    const content = contentOf(20);
    const manifest = await manifestFor('att-1', content);
    const { transfer, saved, rejected } = harness();

    await transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 0, manifests: [manifest] });
    await transfer.receive(
      chunkMessage({
        attachmentId: 'att-1',
        index: 0,
        bytes: new Uint8Array(CHUNK).fill(9),
      }),
    );

    expect(saved).toEqual([]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.attachmentId).toBe('att-1');
  });

  it('discards a chunk for something it never asked for', async () => {
    const content = contentOf(20);
    const { transfer, saved, rejected } = harness();

    await transfer.receive(
      chunkMessage({ attachmentId: 'unsolicited', index: 0, bytes: chunkOf(content, 0) }),
    );

    expect(saved).toEqual([]);
    expect(rejected).toEqual([]);
  });

  it('ignores a message that is not about attachments', async () => {
    const { transfer, sent } = harness();
    const onRejected = vi.fn();

    await transfer.receive({ v: 1, kind: 'request', requests: [] });

    expect(sent).toEqual([]);
    expect(onRejected).not.toHaveBeenCalled();
  });
});

describe('paging', () => {
  /** Feed a transfer every chunk it asks for, page after page. */
  const drain = async (options: {
    transfer: ReturnType<typeof createAttachmentTransfer>;
    sent: CatchUpMessage[];
    content: Uint8Array;
  }): Promise<number[][]> => {
    const { transfer, sent, content } = options;
    const pages: number[][] = [];
    for (;;) {
      const request = sent.find(
        (message): message is Extract<CatchUpMessage, { kind: 'attachment-request' }> =>
          message.kind === 'attachment-request',
      );
      if (request === undefined) return pages;
      sent.length = 0;
      pages.push(request.indices);
      for (const index of request.indices) {
        await transfer.receive(
          chunkMessage({
            attachmentId: request.attachmentId,
            index,
            bytes: chunkOf(content, index),
          }),
        );
      }
    }
  };

  it.each([257, 800])('asks for an attachment of %i chunks a page at a time', async (count) => {
    const content = contentOf(count * CHUNK);
    const manifest = await manifestFor('a1', content);
    const { transfer, sent, saved } = harness();

    await transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 0, manifests: [manifest] });
    const pages = await drain({ transfer, sent, content });

    // Every page is inside the wire limit, and no index is asked for twice.
    expect(pages.every((page) => page.length <= MAX_REQUESTED_CHUNKS)).toBe(true);
    const asked = pages.flat();
    expect(new Set(asked).size).toBe(asked.length);
    expect(asked).toHaveLength(count);
    expect(saved).toHaveLength(1);
    expect(saved[0].content).toEqual(content);
  });

  it('asks once per page, not once per chunk', async () => {
    const count = 300;
    const content = contentOf(count * CHUNK);
    const manifest = await manifestFor('a1', content);
    const { transfer, sent } = harness();

    await transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 0, manifests: [manifest] });
    const [first] = sent.filter((message) => message.kind === 'attachment-request');
    sent.length = 0;

    // Half of the first page arrives; nothing further is asked for until the
    // page is satisfied, or a peer would be asked for the same index repeatedly.
    if (first.kind !== 'attachment-request') throw new Error('no request was sent');
    for (const index of first.indices.slice(0, 128)) {
      await transfer.receive(
        chunkMessage({ attachmentId: 'a1', index, bytes: chunkOf(content, index) }),
      );
    }

    expect(sent.filter((message) => message.kind === 'attachment-request')).toHaveLength(0);
  });

  it.each([257, 600])('walks a catalogue of %i manifests a page at a time', async (count) => {
    const manifests = await Promise.all(
      Array.from({ length: count }, (_unused, index) =>
        manifestFor(`a${String(index)}`, contentOf(CHUNK)),
      ),
    );
    const { transfer, sent } = harness();

    transfer.offer(manifests);

    // One page, sized to what a receiver will assemble at once. Offering the
    // whole catalogue would have all but the first few declined and never
    // mentioned again.
    const offers = () =>
      sent.filter(
        (message): message is Extract<CatchUpMessage, { kind: 'attachment-offer' }> =>
          message.kind === 'attachment-offer',
      );
    expect(offers()).toHaveLength(1);
    expect(offers()[0].manifests.length).toBeLessThanOrEqual(MAX_OFFERS_PER_PAGE);

    // The receiver asks for what follows the page it has finished with, and
    // keeps asking until the catalogue runs out.
    for (;;) {
      const last = offers().at(-1);
      if (last === undefined) break;
      const next = last.cursor + last.manifests.length;
      if (next >= count) break;
      await transfer.receive({ v: 1, kind: 'attachment-offer-next', cursor: next });
    }

    const offered = offers().flatMap((offer) => offer.manifests.map((one) => one.attachmentId));
    expect(new Set(offered).size).toBe(count);
    for (const message of offers()) {
      expect(message.manifests.length).toBeLessThanOrEqual(MAX_OFFERS_PER_PAGE);
      expect(() => decodeCatchUpMessage(encodeCatchUpMessage(message))).not.toThrow();
    }
  });

  it('asks for the page after the one it has settled', async () => {
    const content = contentOf(CHUNK);
    const manifests = await Promise.all(
      Array.from({ length: 2 }, (_unused, index) =>
        manifestFor(`a${String(index)}`, content),
      ),
    );
    const { transfer, sent } = harness({ held: () => new Set([0]) });

    // Both are already held, so the page settles without a chunk moving.
    await transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 0, manifests });

    expect(sent).toContainEqual({ v: 1, kind: 'attachment-offer-next', cursor: 2 });
    expect(sent.filter((message) => message.kind === 'attachment-request')).toHaveLength(0);
  });

  describe('where the catalogue is being read from', () => {
    /** A first page taken and settled on arrival, leaving the cursor at two. */
    const afterFirstPage = async () => {
      const { transfer, sent } = harness({ held: () => new Set([0]) });
      const manifests = await Promise.all(
        Array.from({ length: 2 }, (_unused, index) =>
          manifestFor(`a${String(index)}`, contentOf(CHUNK)),
        ),
      );
      await transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 0, manifests });
      sent.length = 0;
      return { transfer, sent };
    };

    it.each([
      ['replays a page already taken', 0],
      ['overlaps a page already taken', 1],
      ['skips past the page that is due', 4],
    ])('refuses an offer page that %s', async (_named, cursor) => {
      const { transfer, sent } = await afterFirstPage();
      const manifest = await manifestFor('later', contentOf(CHUNK));

      await expect(
        transfer.receive({ v: 1, kind: 'attachment-offer', cursor, manifests: [manifest] }),
      ).rejects.toBeInstanceOf(AttachmentCursorError);
      // Nothing was taken from it, so nothing was asked for either.
      expect(sent).toEqual([]);
    });

    it('refuses a page that arrives while the one before it is outstanding', async () => {
      const { transfer } = harness();
      const first = await manifestFor('att-1', contentOf(24));
      const second = await manifestFor('att-2', contentOf(24));

      // Nothing is held, so the first page is still being worked through.
      await transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 0, manifests: [first] });

      // Taking this one would overwrite what is outstanding, losing the
      // attachments in the page it replaced.
      await expect(
        transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 1, manifests: [second] }),
      ).rejects.toBeInstanceOf(AttachmentCursorError);
    });

    it('refuses a page that offers nothing', async () => {
      const { transfer } = harness();

      // There is no cursor a page of no manifests would move either device to.
      await expect(
        transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 0, manifests: [] }),
      ).rejects.toBeInstanceOf(AttachmentCursorError);
    });

    it('refuses an ask for a page it is not waiting to serve', async () => {
      const { transfer, sent } = harness();
      const manifests = await Promise.all(
        Array.from({ length: MAX_OFFERS_PER_PAGE + 2 }, (_unused, index) =>
          manifestFor(`a${String(index)}`, contentOf(CHUNK)),
        ),
      );

      transfer.offer(manifests);
      sent.length = 0;

      // The page in flight ends where it ends: any other cursor is a peer
      // asking to be re-sent a place in the catalogue it has already had.
      await expect(
        transfer.receive({ v: 1, kind: 'attachment-offer-next', cursor: 0 }),
      ).rejects.toBeInstanceOf(AttachmentCursorError);
      expect(sent).toEqual([]);
    });

    it('refuses an ask repeated once the catalogue has run out', async () => {
      const { transfer, sent } = harness();
      const manifests = await Promise.all(
        Array.from({ length: 2 }, (_unused, index) =>
          manifestFor(`a${String(index)}`, contentOf(CHUNK)),
        ),
      );

      transfer.offer(manifests);
      await transfer.receive({ v: 1, kind: 'attachment-offer-next', cursor: 2 });
      sent.length = 0;

      await expect(
        transfer.receive({ v: 1, kind: 'attachment-offer-next', cursor: 2 }),
      ).rejects.toBeInstanceOf(AttachmentCursorError);
      expect(sent).toEqual([]);
    });
  });

  it('fails observably when the sender cannot supply a chunk it was asked for', async () => {
    const content = contentOf(3 * CHUNK);
    const manifest = await manifestFor('a1', content);
    const { transfer, sent, rejected, saved } = harness();

    await transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 0, manifests: [manifest] });
    sent.length = 0;
    await transfer.receive({
      v: 1,
      kind: 'attachment-unavailable',
      attachmentId: 'a1',
      indices: [1],
    });

    // Waiting forever for a chunk the peer has said it does not hold is the one
    // outcome that reads as a healthy transfer while never completing.
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(StalledAttachmentTransferError);
    expect(saved).toHaveLength(0);
    // The transfer is dropped, so a later page offering it starts it again.
    await transfer.receive({ v: 1, kind: 'attachment-offer', cursor: 1, manifests: [manifest] });
    expect(sent.some((message) => message.kind === 'attachment-request')).toBe(true);
  });

  it('tells a peer which chunks it asked for that cannot be served', async () => {
    const content = contentOf(2 * CHUNK);
    const { transfer, sent } = harness({ serve: content });

    await transfer.receive({
      v: 1,
      kind: 'attachment-request',
      attachmentId: 'a1',
      indices: [0, 7],
    });

    expect(sent.filter((message) => message.kind === 'attachment-chunk')).toHaveLength(1);
    expect(sent).toContainEqual({
      v: 1,
      kind: 'attachment-unavailable',
      attachmentId: 'a1',
      indices: [7],
    });
  });
});
