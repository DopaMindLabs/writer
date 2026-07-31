import { describe, expect, it, vi } from 'vitest';
import { toBase64Url } from '../crypto/base64url';
import type { AttachmentChunkManifest } from './operation.types';
import { buildChunkManifest } from './attachmentChunking';
import { MAX_FRAME_BYTES } from '../providers/webrtc/webRtcTransport';
import { encodeCatchUpMessage, type CatchUpMessage } from './catchUpMessage';
import {
  MAX_INFLIGHT_ATTACHMENTS,
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
    readChunk: async ({ index }) =>
      options.serve === undefined ? undefined : chunkOf(options.serve, index),
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

    expect(sent).toEqual([{ v: 1, kind: 'attachment-offer', manifests: [manifest] }]);
  });
});

describe('createAttachmentTransfer receiving an offer', () => {
  it('asks only for the chunks it is missing', async () => {
    const { transfer, sent } = harness({ held: () => new Set([0, 2]) });
    const manifest = await manifestFor('att-1', contentOf(24));

    await transfer.receive({ v: 1, kind: 'attachment-offer', manifests: [manifest] });

    expect(sent).toEqual([
      { v: 1, kind: 'attachment-request', attachmentId: 'att-1', indices: [1] },
    ]);
  });

  it('asks for nothing when it already holds every chunk', async () => {
    const { transfer, sent } = harness({ held: () => new Set([0, 1, 2]) });
    const manifest = await manifestFor('att-1', contentOf(24));

    await transfer.receive({ v: 1, kind: 'attachment-offer', manifests: [manifest] });

    expect(sent).toEqual([]);
  });

  it('does not re-request an attachment already in flight', async () => {
    const { transfer, sent } = harness();
    const manifest = await manifestFor('att-1', contentOf(24));
    const offer: CatchUpMessage = { v: 1, kind: 'attachment-offer', manifests: [manifest] };

    await transfer.receive(offer);
    await transfer.receive(offer);

    expect(sent).toHaveLength(1);
  });

  it('declines an offer beyond the in-flight ceiling instead of queueing it', async () => {
    const { transfer, sent, rejected } = harness();
    const manifests = await Promise.all(
      Array.from({ length: MAX_INFLIGHT_ATTACHMENTS + 1 }, (_unused, index) =>
        manifestFor(`att-${String(index)}`, contentOf(24)),
      ),
    );

    await transfer.receive({ v: 1, kind: 'attachment-offer', manifests });

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

  it('stays silent about a chunk it does not hold', async () => {
    const { transfer, sent } = harness();

    await transfer.receive({
      v: 1,
      kind: 'attachment-request',
      attachmentId: 'att-1',
      indices: [0],
    });

    expect(sent).toEqual([]);
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

    await transfer.receive({ v: 1, kind: 'attachment-offer', manifests: [manifest] });
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

    await transfer.receive({ v: 1, kind: 'attachment-offer', manifests: [manifest] });
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

    await transfer.receive({ v: 1, kind: 'attachment-offer', manifests: [manifest] });
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

    await transfer.receive({ v: 1, kind: 'attachment-offer', manifests: [manifest] });
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

    await transfer.receive({ v: 1, kind: 'attachment-offer', manifests: [manifest] });
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

    await transfer.receive({ v: 1, kind: 'attachment-offer', manifests: [manifest] });
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

    await transfer.receive({ v: 1, kind: 'attachment-offer', manifests: [manifest] });
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
