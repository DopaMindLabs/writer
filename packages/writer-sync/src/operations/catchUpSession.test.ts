import { describe, expect, it, vi } from 'vitest';
import type { SyncTransport } from '../core/transport.types';
import type { EncryptedSyncFrame } from './operation.types';
import type { OperationStore } from './operationStore.types';
import type { CatchUpPorts } from './catchUpExchange';
import { decodeCatchUpMessage, encodeCatchUpMessage } from './catchUpMessage';
import { startCatchUpSession } from './catchUpSession';
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
