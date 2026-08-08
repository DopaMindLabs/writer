import { describe, expect, it, vi } from 'vitest';
import { asDeviceId, asOperationId } from '../core/ids';
import type { AccessScopeId } from '../core/providers.types';
import type {
  AttachmentChunkManifest,
  EncryptedSyncFrame,
} from './operation.types';
import type { OperationStore } from './operationStore.types';
import { hashPayload } from './operationCodec';
import { buildScopeManifests } from './scopeManifest';
import {
  CATCH_UP_PROTOCOL_VERSION,
  type CatchUpMessage,
  type OperationAcknowledgement,
} from './catchUpMessage';
import { createCatchUpExchange, type CatchUpPorts } from './catchUpExchange';

const PAYLOAD = 'cGF5bG9hZA';

const frameOf = async (options: {
  id: string;
  millis: number;
  device?: string;
  scope?: string;
}): Promise<EncryptedSyncFrame> => ({
  v: 1,
  operationId: asOperationId(options.id),
  accessScopeId: options.scope ?? 'scope-1',
  entityTable: 'notes',
  entityId: `entity-${options.id}`,
  kind: 'put',
  deviceId: asDeviceId(options.device ?? 'device-a'),
  logicalAt: { millis: options.millis, counter: 0 },
  keyId: 'key-1',
  epoch: 1,
  payloadHash: await hashPayload(PAYLOAD),
  payload: PAYLOAD,
  signature: 'signed',
});

const memoryStore = (
  frames: EncryptedSyncFrame[],
  refuses: (frame: EncryptedSyncFrame) => boolean = () => false,
): OperationStore => ({
  append: async (frame) => {
    if (refuses(frame)) throw new Error('the journal could not store this frame');
    if (!frames.some((held) => String(held.operationId) === String(frame.operationId))) {
      frames.push(frame);
    }
  },
  byId: async (operationId) =>
    frames.find((frame) => String(frame.operationId) === String(operationId)),
  forScope: async (accessScopeId) =>
    frames.filter((frame) => frame.accessScopeId === accessScopeId),
});

const harness = (options: {
  frames?: EncryptedSyncFrame[];
  scopes?: AccessScopeId[];
  verifySignature?: (frame: EncryptedSyncFrame) => Promise<boolean>;
  fullState?: (accessScopeId: AccessScopeId) => Promise<EncryptedSyncFrame[]>;
  retentionCutoff?: () => number;
  maxMessageBytes?: number;
  onUndeliverableFrame?: (frame: EncryptedSyncFrame, reason: unknown) => void;
  attachments?: CatchUpPorts['attachments'];
  /** Which frames this device's journal refuses to store. */
  unstorable?: (frame: EncryptedSyncFrame) => boolean;
  /** Offer the paced write, and hold each one until the test lets it go. */
  pacedSends?: boolean;
} = {}) => {
  const frames = options.frames ?? [];
  const sent: CatchUpMessage[] = [];
  const acknowledged: OperationAcknowledgement[] = [];
  const rejected: EncryptedSyncFrame[] = [];
  const unstored: EncryptedSyncFrame[] = [];
  const onFramesJournalled = vi.fn();
  let failNext = false;

  /** Writes that are waiting for the bearer to take them. */
  const waiting: (() => void)[] = [];
  const paced = (message: CatchUpMessage): Promise<void> =>
    new Promise((resolve) => {
      waiting.push(() => {
        sent.push(message);
        resolve();
      });
    });

  const ports: CatchUpPorts = {
    journal: memoryStore(frames, options.unstorable),
    accessibleScopeIds: async () => options.scopes ?? ['scope-1'],
    send: (message) => {
      if (failNext && message.kind === 'frames') {
        failNext = false;
        throw new Error('channel refused the message');
      }
      sent.push(message);
    },
    maxMessageBytes: options.maxMessageBytes,
    onUndeliverableFrame: options.onUndeliverableFrame,
    attachments: options.attachments,
    verifySignature: options.verifySignature ?? (async () => true),
    fullState: options.fullState,
    retentionCutoff: options.retentionCutoff,
    recordPeerAcknowledgement: async (ack) => {
      acknowledged.push(ack);
    },
    onFramesJournalled,
    onRejectedFrame: (frame) => rejected.push(frame),
    onUnstoredFrame: (frame) => unstored.push(frame),
    sendWhenReady: options.pacedSends === true ? paced : undefined,
  };

  return {
    exchange: createCatchUpExchange(ports),
    frames,
    sent,
    acknowledged,
    rejected,
    unstored,
    onFramesJournalled,
    failSendsOnce: () => {
      failNext = true;
    },
    /** Stand in for the bearer taking one paced write. */
    takeOne: async () => {
      waiting.shift()?.();
      await Promise.resolve();
    },
    stillWaiting: () => waiting.length,
  };
};

const manifestMessage = (manifests: ReturnType<typeof buildScopeManifests>): CatchUpMessage => ({
  v: CATCH_UP_PROTOCOL_VERSION,
  kind: 'manifest',
  manifests,
});

describe('createCatchUpExchange start', () => {
  it('opens by publishing a manifest of every accessible scope', async () => {
    const local = await frameOf({ id: 'op-1', millis: 10 });
    const { exchange, sent } = harness({ frames: [local] });

    await exchange.start();

    expect(sent).toEqual([manifestMessage(buildScopeManifests([local]))]);
  });

  it('publishes an empty manifest when it holds nothing', async () => {
    const { exchange, sent } = harness();

    await exchange.start();

    expect(sent).toEqual([{ v: 1, kind: 'manifest', manifests: [] }]);
  });
});

describe('createCatchUpExchange on a peer manifest', () => {
  it('requests what it is missing', async () => {
    const { exchange, sent } = harness();
    const remote = await frameOf({ id: 'op-1', millis: 10 });

    await exchange.receive(manifestMessage(buildScopeManifests([remote])));

    expect(sent).toEqual([
      {
        v: 1,
        kind: 'request',
        requests: [
          { accessScopeId: 'scope-1', originDeviceId: 'device-a', after: undefined },
        ],
      },
    ]);
  });

  it('still answers when it needs nothing, so the peer is not left waiting', async () => {
    const local = await frameOf({ id: 'op-1', millis: 10 });
    const { exchange, sent } = harness({ frames: [local] });

    await exchange.receive(manifestMessage(buildScopeManifests([local])));

    expect(sent).toEqual([{ v: 1, kind: 'request', requests: [] }]);
  });

  it('ignores a scope it cannot decrypt', async () => {
    const { exchange, sent } = harness({ scopes: ['scope-1'] });
    const remote = await frameOf({ id: 'op-x', millis: 10, scope: 'scope-9' });

    await exchange.receive(manifestMessage(buildScopeManifests([remote])));

    expect(sent).toEqual([{ v: 1, kind: 'request', requests: [] }]);
  });
});

describe('createCatchUpExchange on a peer request', () => {
  it('answers with the requested frames and marks the reply final', async () => {
    const held = await frameOf({ id: 'op-1', millis: 10 });
    const { exchange, sent } = harness({ frames: [held] });

    await exchange.receive({
      v: 1,
      kind: 'request',
      requests: [{ accessScopeId: 'scope-1', originDeviceId: asDeviceId('device-a') }],
    });

    expect(sent).toEqual([{ v: 1, kind: 'frames', frames: [held], final: true }]);
  });

  it('offers permitted attachment manifests after the final frame batch', async () => {
    const manifest: AttachmentChunkManifest = {
      attachmentId: 'attachment-1',
      contentHash: 'whole',
      totalBytes: 3,
      chunkBytes: 3,
      chunkCount: 1,
      chunkHashes: ['part'],
    };
    const manifestsForScopes = vi.fn().mockResolvedValue([manifest]);
    const { exchange, sent } = harness({
      attachments: {
        manifestsForScopes,
        create: ({ send }) => ({
          offer: (manifests) => {
            send({
              v: CATCH_UP_PROTOCOL_VERSION,
              kind: 'attachment-offer',
              cursor: 0,
              manifests: [...manifests],
            });
          },
          receive: async () => undefined,
        }),
      },
    });

    await exchange.receive({
      v: 1,
      kind: 'request',
      requests: [
        {
          accessScopeId: 'scope-1',
          originDeviceId: asDeviceId('device-a'),
        },
      ],
    });

    expect(manifestsForScopes).toHaveBeenCalledWith(['scope-1']);
    expect(sent).toEqual([
      { v: 1, kind: 'frames', frames: [], final: true },
      { v: 1, kind: 'attachment-offer', cursor: 0, manifests: [manifest] },
    ]);
  });

  it('splits a reply that would outgrow the transport, final on the last part', async () => {
    // Frames that fit individually but not together: the count ceiling alone
    // would put all of them in one message the channel then refuses.
    const held = await Promise.all(
      Array.from({ length: 6 }, (_, index) => frameOf({ id: `op-${String(index)}`, millis: 10 })),
    );
    const { exchange, sent } = harness({ frames: held, maxMessageBytes: 900 });

    await exchange.receive({
      v: 1,
      kind: 'request',
      requests: [{ accessScopeId: 'scope-1', originDeviceId: asDeviceId('device-a') }],
    });

    const replies = sent.filter((message) => message.kind === 'frames');
    expect(replies.length).toBeGreaterThan(1);
    for (const reply of replies) {
      expect(
        new TextEncoder().encode(JSON.stringify(reply)).byteLength,
      ).toBeLessThanOrEqual(900);
    }
    expect(replies.flatMap((reply) => reply.frames)).toEqual(held);
    expect(replies.map((reply) => reply.final)).toEqual([
      ...Array.from({ length: replies.length - 1 }, () => false),
      true,
    ]);
  });

  it('skips a frame no message can carry, reports it, and still finishes', async () => {
    const small = await frameOf({ id: 'op-small', millis: 10 });
    const huge = {
      ...(await frameOf({ id: 'op-huge', millis: 11 })),
      payload: 'p'.repeat(4_000),
      payloadHash: await hashPayload('p'.repeat(4_000)),
    };
    const undeliverable: EncryptedSyncFrame[] = [];
    const { exchange, sent } = harness({
      frames: [huge, small],
      maxMessageBytes: 2_000,
      onUndeliverableFrame: (frame) => undeliverable.push(frame),
    });

    await exchange.receive({
      v: 1,
      kind: 'request',
      requests: [{ accessScopeId: 'scope-1', originDeviceId: asDeviceId('device-a') }],
    });

    const replies = sent.filter((message) => message.kind === 'frames');
    expect(undeliverable).toEqual([huge]);
    expect(replies.flatMap((reply) => reply.frames)).toEqual([small]);
    expect(replies.at(-1)?.final).toBe(true);
  });

  it('keeps sending after a send that throws, so the final marker still goes out', async () => {
    const held = await Promise.all(
      Array.from({ length: 6 }, (_, index) => frameOf({ id: `op-${String(index)}`, millis: 10 })),
    );
    const { exchange, sent, failSendsOnce } = harness({
      frames: held,
      maxMessageBytes: 900,
    });
    failSendsOnce();

    await expect(
      exchange.receive({
        v: 1,
        kind: 'request',
        requests: [{ accessScopeId: 'scope-1', originDeviceId: asDeviceId('device-a') }],
      }),
    ).rejects.toThrow(/channel refused/);

    // The failed batch is lost — its frames travel on the next catch-up — but
    // the reply still closed, so what did arrive is acknowledged rather than
    // re-sent for ever.
    const replies = sent.filter((message) => message.kind === 'frames');
    expect(replies.length).toBeGreaterThan(0);
    expect(replies.at(-1)?.final).toBe(true);
  });

  it('lets the bearer set the pace of a many-batch reply', async () => {
    // Written straight out, the batches of a large reply fill the outbox — it
    // is bounded — and the transport fails the session rather than growing.
    // The `fullState` path re-mints the reply each attempt, so it never gets
    // smaller: pairing against a large scope would fail for ever.
    const held = await Promise.all(
      Array.from({ length: 6 }, (_, index) => frameOf({ id: `op-${String(index)}`, millis: 10 })),
    );
    const { exchange, sent, stillWaiting, takeOne } = harness({
      frames: held,
      maxMessageBytes: 900,
      pacedSends: true,
    });

    const answered = exchange.receive({
      v: 1,
      kind: 'request',
      requests: [{ accessScopeId: 'scope-1', originDeviceId: asDeviceId('device-a') }],
    });

    // One in flight, the rest still held back: nothing is queued ahead of what
    // the bearer has actually taken.
    await vi.waitFor(() => {
      expect(stillWaiting()).toBe(1);
    });
    expect(sent).toHaveLength(0);

    while (!sent.some((message) => message.kind === 'frames' && message.final)) {
      await vi.waitFor(() => {
        expect(stillWaiting()).toBe(1);
      });
      await takeOne();
    }
    await answered;

    const replies = sent.filter((message) => message.kind === 'frames');
    expect(replies.length).toBeGreaterThan(1);
    expect(replies.at(-1)?.final).toBe(true);
  });

  it('answers an empty request with an empty final reply', async () => {
    const { exchange, sent } = harness();

    await exchange.receive({ v: 1, kind: 'request', requests: [] });

    expect(sent).toEqual([{ v: 1, kind: 'frames', frames: [], final: true }]);
  });

  it('never answers for a scope it does not itself hold access to', async () => {
    const held = await frameOf({ id: 'op-x', millis: 10, scope: 'scope-9' });
    const { exchange, sent } = harness({ frames: [held], scopes: ['scope-1'] });

    await exchange.receive({
      v: 1,
      kind: 'request',
      requests: [{ accessScopeId: 'scope-9', originDeviceId: asDeviceId('device-a') }],
    });

    expect(sent).toEqual([{ v: 1, kind: 'frames', frames: [], final: true }]);
  });
});

describe('createCatchUpExchange answering a peer the journal cannot serve', () => {
  it('rebuilds current state for a peer that has never synchronised', async () => {
    const held = await frameOf({ id: 'op-old', millis: 10 });
    const rebuilt = await frameOf({ id: 'op-now', millis: 900 });
    const { exchange, sent } = harness({
      frames: [held],
      fullState: async () => [rebuilt],
    });

    await exchange.receive({
      v: 1,
      kind: 'request',
      requests: [{ accessScopeId: 'scope-1', originDeviceId: asDeviceId('device-a') }],
    });

    expect(sent).toEqual([{ v: 1, kind: 'frames', frames: [rebuilt], final: true }]);
  });

  it('rebuilds for a peer asking from behind the compaction cutoff', async () => {
    const rebuilt = await frameOf({ id: 'op-now', millis: 900 });
    const { exchange, sent } = harness({
      fullState: async () => [rebuilt],
      retentionCutoff: () => 500,
    });

    await exchange.receive({
      v: 1,
      kind: 'request',
      requests: [
        {
          accessScopeId: 'scope-1',
          originDeviceId: asDeviceId('device-a'),
          after: { millis: 100, counter: 0 },
        },
      ],
    });

    expect(sent).toEqual([{ v: 1, kind: 'frames', frames: [rebuilt], final: true }]);
  });

  it('replays history for a peer still inside the window', async () => {
    const held = await frameOf({ id: 'op-recent', millis: 800 });
    const { exchange, sent } = harness({
      frames: [held],
      fullState: async () => [await frameOf({ id: 'op-now', millis: 900 })],
      retentionCutoff: () => 500,
    });

    await exchange.receive({
      v: 1,
      kind: 'request',
      requests: [
        {
          accessScopeId: 'scope-1',
          originDeviceId: asDeviceId('device-a'),
          after: { millis: 700, counter: 0 },
        },
      ],
    });

    expect(sent).toEqual([{ v: 1, kind: 'frames', frames: [held], final: true }]);
  });

  it('rebuilds a scope once however many origins asked for it', async () => {
    const rebuilt = await frameOf({ id: 'op-now', millis: 900 });
    const fullState = vi.fn().mockResolvedValue([rebuilt]);
    const { exchange, sent } = harness({ fullState });

    await exchange.receive({
      v: 1,
      kind: 'request',
      requests: [
        { accessScopeId: 'scope-1', originDeviceId: asDeviceId('device-a') },
        { accessScopeId: 'scope-1', originDeviceId: asDeviceId('device-b') },
      ],
    });

    expect(fullState).toHaveBeenCalledTimes(1);
    expect(sent).toEqual([{ v: 1, kind: 'frames', frames: [rebuilt], final: true }]);
  });

  it('falls back to surviving history when it cannot rebuild', async () => {
    const held = await frameOf({ id: 'op-old', millis: 10 });
    const { exchange, sent } = harness({ frames: [held] });

    await exchange.receive({
      v: 1,
      kind: 'request',
      requests: [{ accessScopeId: 'scope-1', originDeviceId: asDeviceId('device-a') }],
    });

    expect(sent).toEqual([{ v: 1, kind: 'frames', frames: [held], final: true }]);
  });
});

describe('createCatchUpExchange on inbound frames', () => {
  it('journals a verified frame and acknowledges it on the final batch', async () => {
    const { exchange, frames, sent, onFramesJournalled } = harness();
    const inbound = await frameOf({ id: 'op-1', millis: 10 });

    await exchange.receive({ v: 1, kind: 'frames', frames: [inbound], final: true });

    expect(frames).toEqual([inbound]);
    expect(onFramesJournalled).toHaveBeenCalledTimes(1);
    expect(sent).toEqual([
      {
        v: 1,
        kind: 'ack',
        acknowledgements: [
          {
            accessScopeId: 'scope-1',
            originDeviceId: 'device-a',
            operationId: 'op-1',
          },
        ],
      },
    ]);
  });

  it('acknowledges across the batches of one reply, once it completes', async () => {
    const { exchange, sent } = harness();
    const first = await frameOf({ id: 'op-1', millis: 10 });
    const second = await frameOf({ id: 'op-2', millis: 20 });

    await exchange.receive({ v: 1, kind: 'frames', frames: [first], final: false });
    await exchange.receive({ v: 1, kind: 'frames', frames: [second], final: true });

    expect(sent).toEqual([
      {
        v: 1,
        kind: 'ack',
        acknowledgements: [
          { accessScopeId: 'scope-1', originDeviceId: 'device-a', operationId: 'op-2' },
        ],
      },
    ]);
  });

  it('never lets an older frame in a later batch walk the mark backwards', async () => {
    const { exchange, sent } = harness();
    const newer = await frameOf({ id: 'op-2', millis: 20 });
    const older = await frameOf({ id: 'op-1', millis: 10 });

    await exchange.receive({ v: 1, kind: 'frames', frames: [newer], final: false });
    await exchange.receive({ v: 1, kind: 'frames', frames: [older], final: true });

    expect(sent).toEqual([
      {
        v: 1,
        kind: 'ack',
        acknowledgements: [
          { accessScopeId: 'scope-1', originDeviceId: 'device-a', operationId: 'op-2' },
        ],
      },
    ]);
  });

  it('acknowledges only once the reply is complete', async () => {
    const { exchange, sent, frames } = harness();
    const inbound = await frameOf({ id: 'op-1', millis: 10 });

    await exchange.receive({ v: 1, kind: 'frames', frames: [inbound], final: false });

    expect(frames).toEqual([inbound]);
    expect(sent).toEqual([]);
  });

  it('rejects a frame whose payload does not match its hash', async () => {
    const { exchange, frames, rejected } = harness();
    const tampered = { ...(await frameOf({ id: 'op-1', millis: 10 })), payload: 'b3RoZXI' };

    await exchange.receive({ v: 1, kind: 'frames', frames: [tampered], final: true });

    expect(frames).toEqual([]);
    expect(rejected.map((frame) => String(frame.operationId))).toEqual(['op-1']);
  });

  it('rejects a frame whose signature does not verify', async () => {
    const { exchange, frames, rejected } = harness({
      verifySignature: async () => false,
    });
    const inbound = await frameOf({ id: 'op-1', millis: 10 });

    await exchange.receive({ v: 1, kind: 'frames', frames: [inbound], final: true });

    expect(frames).toEqual([]);
    expect(rejected.map((frame) => String(frame.operationId))).toEqual(['op-1']);
  });

  it('rejects a frame for a scope it has no key for', async () => {
    const { exchange, frames, rejected } = harness({ scopes: ['scope-1'] });
    const inbound = await frameOf({ id: 'op-x', millis: 10, scope: 'scope-9' });

    await exchange.receive({ v: 1, kind: 'frames', frames: [inbound], final: true });

    expect(frames).toEqual([]);
    expect(rejected.map((frame) => String(frame.operationId))).toEqual(['op-x']);
  });

  it('keeps the rest of a batch when one frame is rejected', async () => {
    const { exchange, frames, rejected } = harness();
    const good = await frameOf({ id: 'op-good', millis: 10 });
    const bad = { ...(await frameOf({ id: 'op-bad', millis: 20 })), payload: 'b3RoZXI' };

    await exchange.receive({ v: 1, kind: 'frames', frames: [bad, good], final: true });

    expect(frames).toEqual([good]);
    expect(rejected.map((frame) => String(frame.operationId))).toEqual(['op-bad']);
  });

  it('applies the same frame twice without journalling it twice', async () => {
    const { exchange, frames } = harness();
    const inbound = await frameOf({ id: 'op-1', millis: 10 });

    await exchange.receive({ v: 1, kind: 'frames', frames: [inbound], final: true });
    await exchange.receive({ v: 1, kind: 'frames', frames: [inbound], final: true });

    expect(frames).toEqual([inbound]);
  });

  it('acknowledges the newest operation per origin, not each one', async () => {
    const { exchange, sent } = harness();
    const first = await frameOf({ id: 'op-1', millis: 10 });
    const second = await frameOf({ id: 'op-2', millis: 20 });
    const other = await frameOf({ id: 'op-b', millis: 5, device: 'device-b' });

    await exchange.receive({
      v: 1,
      kind: 'frames',
      frames: [first, second, other],
      final: true,
    });

    expect(sent).toEqual([
      {
        v: 1,
        kind: 'ack',
        acknowledgements: [
          { accessScopeId: 'scope-1', originDeviceId: 'device-a', operationId: 'op-2' },
          { accessScopeId: 'scope-1', originDeviceId: 'device-b', operationId: 'op-b' },
        ],
      },
    ]);
  });

  it('acknowledges nothing for an origin whose frame it could not store', async () => {
    // The peer reads an acknowledgement as "everything up to here is held", and
    // compacts on it. Acknowledging the newer frame over a hole would have the
    // peer drop the one that never landed, with nothing left to ask again.
    const first = await frameOf({ id: 'op-1', millis: 10 });
    const second = await frameOf({ id: 'op-2', millis: 20 });
    const { exchange, sent, frames, unstored } = harness({
      unstorable: (frame) => String(frame.operationId) === 'op-1',
    });

    await exchange.receive({ v: 1, kind: 'frames', frames: [first, second], final: true });

    expect(frames).toEqual([second]);
    expect(unstored.map((frame) => String(frame.operationId))).toEqual(['op-1']);
    expect(sent).toEqual([]);
  });

  it('still acknowledges the origins whose frames all landed', async () => {
    const first = await frameOf({ id: 'op-1', millis: 10 });
    const other = await frameOf({ id: 'op-b', millis: 5, device: 'device-b' });
    const { exchange, sent } = harness({
      unstorable: (frame) => String(frame.operationId) === 'op-1',
    });

    await exchange.receive({ v: 1, kind: 'frames', frames: [first, other], final: true });

    expect(sent).toEqual([
      {
        v: 1,
        kind: 'ack',
        acknowledgements: [
          { accessScopeId: 'scope-1', originDeviceId: 'device-b', operationId: 'op-b' },
        ],
      },
    ]);
  });

  it('acknowledges up to the last frame before the one it could not store', async () => {
    const first = await frameOf({ id: 'op-1', millis: 10 });
    const second = await frameOf({ id: 'op-2', millis: 20 });
    const { exchange, sent } = harness({
      unstorable: (frame) => String(frame.operationId) === 'op-2',
    });

    await exchange.receive({ v: 1, kind: 'frames', frames: [first, second], final: true });

    expect(sent).toEqual([
      {
        v: 1,
        kind: 'ack',
        acknowledgements: [
          { accessScopeId: 'scope-1', originDeviceId: 'device-a', operationId: 'op-1' },
        ],
      },
    ]);
  });

  it('acknowledges over a refused frame, which is not a hole in what it holds', async () => {
    // A frame that failed verification is one this device has decided is not
    // authentic — there is nothing to keep and nothing to owe the peer for.
    const tampered = { ...(await frameOf({ id: 'op-1', millis: 10 })), payload: 'b3RoZXI' };
    const second = await frameOf({ id: 'op-2', millis: 20 });
    const { exchange, sent, unstored } = harness();

    await exchange.receive({ v: 1, kind: 'frames', frames: [tampered, second], final: true });

    expect(unstored).toEqual([]);
    expect(sent).toEqual([
      {
        v: 1,
        kind: 'ack',
        acknowledgements: [
          { accessScopeId: 'scope-1', originDeviceId: 'device-a', operationId: 'op-2' },
        ],
      },
    ]);
  });

  it('sends no acknowledgement when the whole reply was empty', async () => {
    const { exchange, sent, onFramesJournalled } = harness();

    await exchange.receive({ v: 1, kind: 'frames', frames: [], final: true });

    expect(sent).toEqual([]);
    expect(onFramesJournalled).not.toHaveBeenCalled();
  });
});

describe('createCatchUpExchange on a peer acknowledgement', () => {
  it('records how far the peer has read', async () => {
    const { exchange, acknowledged } = harness();
    const ack = {
      accessScopeId: 'scope-1',
      originDeviceId: asDeviceId('device-a'),
      operationId: asOperationId('op-1'),
    };

    await exchange.receive({ v: 1, kind: 'ack', acknowledgements: [ack] });

    expect(acknowledged).toEqual([ack]);
  });
});
