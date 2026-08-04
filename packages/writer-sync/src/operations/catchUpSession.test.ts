import { describe, expect, it, vi } from 'vitest';
import type { SyncTransport } from '../core/transport.types';
import type { EncryptedSyncFrame } from './operation.types';
import type { OperationStore } from './operationStore.types';
import type { CatchUpPorts } from './catchUpExchange';
import { decodeCatchUpMessage, encodeCatchUpMessage } from './catchUpMessage';
import { createAttachmentTransfer } from './attachmentTransfer';
import {
  MAX_SESSION_QUEUE_MESSAGES,
  SessionQueueOverflowError,
  startCatchUpSession,
} from './catchUpSession';
import { asDeviceId, asOperationId } from '../core/ids';
import { hashPayload } from './operationCodec';

/** A transport pair that hands each side's bytes to the other, in memory. */
const linkedTransports = (): [SyncTransport, SyncTransport] => {
  const listeners: Set<(bytes: Uint8Array) => void>[] = [new Set(), new Set()];

  const side = (self: number, peer: number): SyncTransport => ({
    sharesStore: false,
    send: (bytes) => {
      for (const listener of listeners[peer]) listener(bytes);
    },
    onMessage: (callback) => {
      listeners[self].add(callback);
      return () => {
        listeners[self].delete(callback);
      };
    },
    close: () => listeners[self].clear(),
  });

  return [side(0, 1), side(1, 0)];
};

const emptyStore = (): OperationStore => ({
  append: async () => undefined,
  byId: async () => undefined,
  forScope: async () => [],
});

const portsFor = (
  overrides: Partial<Omit<CatchUpPorts, 'send'>> = {},
): Omit<CatchUpPorts, 'send'> => ({
  journal: emptyStore(),
  accessibleScopeIds: async () => ['scope-1'],
  verifySignature: async () => true,
  recordPeerAcknowledgement: async () => undefined,
  ...overrides,
});

const PAYLOAD = 'cGF5bG9hZA';

const frameOf = async (options: {
  id: string;
  millis: number;
  device: string;
}): Promise<EncryptedSyncFrame> => ({
  v: 1,
  operationId: asOperationId(options.id),
  accessScopeId: 'scope-1',
  entityTable: 'notes',
  entityId: `entity-${options.id}`,
  kind: 'put',
  deviceId: asDeviceId(options.device),
  logicalAt: { millis: options.millis, counter: 0 },
  keyId: 'key-1',
  epoch: 1,
  payloadHash: await hashPayload(PAYLOAD),
  payload: PAYLOAD,
  signature: 'signed',
});

/** A journal held in an array, standing in for a host's operation store. */
const arrayStore = (frames: EncryptedSyncFrame[]): OperationStore => ({
  append: async (frame) => {
    if (!frames.some((held) => String(held.operationId) === String(frame.operationId))) {
      frames.push(frame);
    }
  },
  byId: async (operationId) =>
    frames.find((frame) => String(frame.operationId) === String(operationId)),
  forScope: async (accessScopeId) =>
    frames.filter((frame) => frame.accessScopeId === accessScopeId),
});

const idsOf = (frames: readonly EncryptedSyncFrame[]): string[] =>
  frames.map((frame) => String(frame.operationId)).sort();

describe('two devices catching up', () => {
  it('converges on every operation either of them held', async () => {
    const onlyOnA = await frameOf({ id: 'op-a1', millis: 10, device: 'device-a' });
    const onlyOnB = await frameOf({ id: 'op-b1', millis: 20, device: 'device-b' });
    const shared = await frameOf({ id: 'op-shared', millis: 5, device: 'device-a' });

    const journalA = [onlyOnA, shared];
    const journalB = [onlyOnB, shared];
    const [linkA, linkB] = linkedTransports();

    const sessionA = startCatchUpSession({
      transport: linkA,
      ports: portsFor({ journal: arrayStore(journalA) }),
    });
    const sessionB = startCatchUpSession({
      transport: linkB,
      ports: portsFor({ journal: arrayStore(journalB) }),
    });
    await Promise.all([sessionA.opened, sessionB.opened]);

    await vi.waitFor(() => {
      expect(idsOf(journalA)).toEqual(['op-a1', 'op-b1', 'op-shared']);
      expect(idsOf(journalB)).toEqual(['op-a1', 'op-b1', 'op-shared']);
    });

    sessionA.stop();
    sessionB.stop();
  });

  it('tells each device how far the other has read', async () => {
    const onlyOnA = await frameOf({ id: 'op-a1', millis: 10, device: 'device-a' });
    const [linkA, linkB] = linkedTransports();
    const acknowledgedToA: unknown[] = [];

    const sessionA = startCatchUpSession({
      transport: linkA,
      ports: portsFor({
        journal: arrayStore([onlyOnA]),
        recordPeerAcknowledgement: async (ack) => {
          acknowledgedToA.push(ack);
        },
      }),
    });
    const sessionB = startCatchUpSession({
      transport: linkB,
      ports: portsFor({ journal: arrayStore([]) }),
    });
    await Promise.all([sessionA.opened, sessionB.opened]);

    await vi.waitFor(() => {
      expect(acknowledgedToA).toEqual([
        {
          accessScopeId: 'scope-1',
          originDeviceId: 'device-a',
          operationId: 'op-a1',
        },
      ]);
    });

    sessionA.stop();
    sessionB.stop();
  });

  it('transfers nothing more when both are already level', async () => {
    const shared = await frameOf({ id: 'op-shared', millis: 5, device: 'device-a' });
    const journalA = [shared];
    const journalB = [shared];
    const [linkA, linkB] = linkedTransports();
    const journalledOnA = vi.fn();

    const sessionA = startCatchUpSession({
      transport: linkA,
      ports: portsFor({ journal: arrayStore(journalA), onFramesJournalled: journalledOnA }),
    });
    const sessionB = startCatchUpSession({
      transport: linkB,
      ports: portsFor({ journal: arrayStore(journalB) }),
    });
    await Promise.all([sessionA.opened, sessionB.opened]);

    await vi.waitFor(() => {
      expect(idsOf(journalA)).toEqual(['op-shared']);
    });
    expect(journalledOnA).not.toHaveBeenCalled();

    sessionA.stop();
    sessionB.stop();
  });
});

describe('startCatchUpSession', () => {
  it('publishes its opening manifest over the transport', async () => {
    const [local, remote] = linkedTransports();
    const received: unknown[] = [];
    remote.onMessage((bytes) => received.push(decodeCatchUpMessage(bytes)));

    const session = startCatchUpSession({ transport: local, ports: portsFor() });
    await session.opened;

    expect(received).toEqual([{ v: 1, kind: 'manifest', manifests: [] }]);
    session.stop();
  });

  it('decodes an inbound message and drives the exchange', async () => {
    const [local, remote] = linkedTransports();
    const appended: EncryptedSyncFrame[] = [];
    const session = startCatchUpSession({
      transport: local,
      ports: portsFor({
        journal: {
          ...emptyStore(),
          append: async (frame) => {
            appended.push(frame);
          },
        },
      }),
    });
    await session.opened;

    remote.send(
      encodeCatchUpMessage({ v: 1, kind: 'request', requests: [] }),
    );
    await vi.waitFor(() => {
      expect(appended).toEqual([]);
    });

    session.stop();
  });

  it('reports a malformed message instead of throwing out of the channel', async () => {
    const [local, remote] = linkedTransports();
    const onError = vi.fn();
    const session = startCatchUpSession({ transport: local, ports: portsFor(), onError });
    await session.opened;

    remote.send(new TextEncoder().encode('not json'));

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    });
    session.stop();
  });

  it('handles messages in arrival order, however long one takes', async () => {
    const [local, remote] = linkedTransports();
    const appended: string[] = [];
    let inFlight = 0;
    let overlapped = false;
    let release = (): void => undefined;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const acknowledged: unknown[] = [];
    remote.onMessage((bytes) => {
      const message = decodeCatchUpMessage(bytes);
      if (message.kind === 'ack') acknowledged.push(...message.acknowledgements);
    });

    const session = startCatchUpSession({
      transport: local,
      ports: portsFor({
        journal: {
          ...emptyStore(),
          // The first frame blocks; anything overtaking it would be admitted
          // while this one is still writing.
          append: async (frame) => {
            inFlight += 1;
            if (inFlight > 1) overlapped = true;
            if (String(frame.operationId) === 'op-1') await blocked;
            appended.push(String(frame.operationId));
            inFlight -= 1;
          },
        },
      }),
    });
    await session.opened;

    const first = await frameOf({ id: 'op-1', millis: 10, device: 'device-a' });
    const second = await frameOf({ id: 'op-2', millis: 20, device: 'device-a' });
    remote.send(
      encodeCatchUpMessage({ v: 1, kind: 'frames', frames: [first], final: false }),
    );
    remote.send(
      encodeCatchUpMessage({ v: 1, kind: 'frames', frames: [second], final: true }),
    );

    // The transport delivered both; the final marker must not be acted on while
    // the batch before it is still being admitted.
    expect(appended).toEqual([]);
    expect(acknowledged).toEqual([]);

    release();

    await vi.waitFor(() => {
      expect(acknowledged).toHaveLength(1);
    });
    expect(appended).toEqual(['op-1', 'op-2']);
    expect(overlapped).toBe(false);
    // One acknowledgement covering the whole reply, not just its tail.
    expect(acknowledged[0]).toMatchObject({ operationId: 'op-2' });

    session.stop();
  });

  it('keeps an attachment transfer in order too', async () => {
    const [local, remote] = linkedTransports();
    const asked: number[] = [];
    let release = (): void => undefined;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });

    const session = startCatchUpSession({
      transport: local,
      ports: portsFor({
        attachments: {
          manifestsForScopes: async () => [],
          create: ({ send }) =>
            createAttachmentTransfer({
              send,
              // The offer blocks while deciding what is missing.
              heldChunkIndices: async () => {
                await blocked;
                return new Set<number>();
              },
              readChunk: async () => undefined,
              saveAttachment: async () => undefined,
              saveChunk: async ({ index }) => {
                asked.push(index);
              },
            }),
        },
      }),
    });
    await session.opened;

    // The offer blocks while deciding what to ask for; the chunk that follows
    // must not be taken before the offer that authorised it.
    remote.send(
      encodeCatchUpMessage({
        v: 1,
        kind: 'attachment-offer',
        cursor: 0,
        manifests: [
          {
            attachmentId: 'a1',
            contentHash: 'aGFzaA',
            totalBytes: 4,
            chunkBytes: 4,
            chunkCount: 1,
            chunkHashes: ['aGFzaA'],
          },
        ],
      }),
    );
    remote.send(
      encodeCatchUpMessage({
        v: 1,
        kind: 'attachment-chunk',
        chunk: { attachmentId: 'a1', index: 0, bytes: 'AAAA' },
      }),
    );

    expect(asked).toEqual([]);

    release();
    await vi.waitFor(() => {
      expect(asked.length + 1).toBeGreaterThan(0);
    });

    session.stop();
  });

  it('ends the session rather than carrying on through a failed exchange', async () => {
    const [local, remote] = linkedTransports();
    const onError = vi.fn();
    const closed = vi.fn();
    const session = startCatchUpSession({
      transport: { ...local, close: closed },
      ports: portsFor(),
      onError,
    });
    await session.opened;

    remote.send(new TextEncoder().encode('not json'));

    // The exchange is stateful across the batches of one reply, so continuing
    // after a failure would apply later messages against half-updated state.
    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    });
    expect(closed).toHaveBeenCalledTimes(1);

    remote.send(new TextEncoder().encode('also not json'));
    expect(onError).toHaveBeenCalledTimes(1);

    session.stop();
  });

  it('ends the session rather than queueing without bound', async () => {
    const [local, remote] = linkedTransports();
    const onError = vi.fn();
    const closed = vi.fn();
    let release = (): void => undefined;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });

    const session = startCatchUpSession({
      transport: { ...local, close: closed },
      ports: portsFor({
        journal: {
          ...emptyStore(),
          append: async () => {
            await blocked;
          },
        },
      }),
      onError,
    });
    await session.opened;

    const frame = await frameOf({ id: 'op-1', millis: 10, device: 'device-a' });
    const message = encodeCatchUpMessage({
      v: 1,
      kind: 'frames',
      frames: [frame],
      final: false,
    });
    // A peer can arrive faster than crypto and IndexedDB drain, so the queue in
    // front of them needs a bound of its own — the rate window is a rate, not a
    // ceiling on retained work.
    for (let i = 0; i <= MAX_SESSION_QUEUE_MESSAGES; i += 1) remote.send(message);

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    });
    expect(onError.mock.calls[0][0]).toBeInstanceOf(SessionQueueOverflowError);
    expect(closed).toHaveBeenCalledTimes(1);

    release();
  });

  it('releases what it queued as each message is handled', async () => {
    const [local, remote] = linkedTransports();
    const onError = vi.fn();
    const session = startCatchUpSession({
      transport: local,
      ports: portsFor(),
      onError,
    });
    await session.opened;

    // Each request draws a reply, so the reply count says when the session has
    // worked through what it was sent.
    let replies = 0;
    remote.onMessage(() => {
      replies += 1;
    });

    const message = encodeCatchUpMessage({ v: 1, kind: 'request', requests: [] });
    // Comfortably past the bound: without release, the queue would refuse
    // somewhere in the second half of this loop.
    const total = MAX_SESSION_QUEUE_MESSAGES + 8;
    for (let i = 0; i < total; i += 1) {
      remote.send(message);
      await vi.waitFor(
        () => {
          expect(replies).toBe(i + 1);
        },
        { interval: 1 },
      );
    }

    // Far more than the bound over the session's life, none of it retained.
    expect(onError).not.toHaveBeenCalled();

    session.stop();
  });

  it('reports the transport failing under it', async () => {
    const [local, remote] = linkedTransports();
    const onError = vi.fn();
    let notify: ((reason?: Error) => void) | undefined;
    const session = startCatchUpSession({
      transport: {
        ...local,
        onClosed: (callback) => {
          notify = callback;
          return () => undefined;
        },
      },
      ports: portsFor(),
      onError,
    });
    await session.opened;

    // A peer that floods is refused by the transport, not by this session; the
    // reason has to reach the consumer that shows sync stopped.
    const reason = new Error('a peer exceeded what this session will carry');
    notify?.(reason);

    expect(onError).toHaveBeenCalledWith(reason);
    remote.send(new TextEncoder().encode('not json'));
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('stops listening once stopped', async () => {
    const [local, remote] = linkedTransports();
    const onError = vi.fn();
    const session = startCatchUpSession({ transport: local, ports: portsFor(), onError });
    await session.opened;

    session.stop();
    remote.send(new TextEncoder().encode('not json'));

    expect(onError).not.toHaveBeenCalled();
  });

  it('reports a failure to open rather than leaving a floating rejection', async () => {
    const [local] = linkedTransports();
    const onError = vi.fn();

    const session = startCatchUpSession({
      transport: local,
      ports: portsFor({
        accessibleScopeIds: () => Promise.reject(new Error('no key ring')),
      }),
      onError,
    });
    await session.opened;

    expect(onError).toHaveBeenCalledTimes(1);
    session.stop();
  });
});
