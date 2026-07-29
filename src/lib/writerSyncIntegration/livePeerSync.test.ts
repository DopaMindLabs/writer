import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  asDeviceId,
  asOperationId,
  asPrincipalId,
  type SyncCoordinator,
} from 'writer-sync/core';
import { toBase64 } from 'writer-sync/crypto';
import {
  decodeCatchUpMessage,
  encodeCatchUpMessage,
  type CatchUpMessage,
  type EncryptedSyncFrame,
} from 'writer-sync/operations';
import { LoremDB } from '@/db/LoremDB';
import type { NoteAttachment } from '@/db/schema';
import { startLivePeerSync } from './livePeerSync';

/**
 * The other half of catch-up: work written *while* a peer is connected.
 *
 * Catch-up answers "what did I miss?" once, when a connection opens. Without
 * this, a device could pair, receive everything, and then watch its peer type
 * for an hour without seeing a word of it.
 */

const HERE = 'device-here';
const THERE = 'device-there';
const PROVIDER = 'writer-p2p';

let db: LoremDB;

const frameOf = (overrides: Partial<EncryptedSyncFrame> = {}): EncryptedSyncFrame => ({
  v: 1,
  operationId: asOperationId('op-1'),
  accessScopeId: 'space-1',
  entityTable: 'docs',
  entityId: 'doc-1',
  kind: 'put',
  deviceId: asDeviceId(HERE),
  logicalAt: { millis: 1_700_000_000_000, counter: 0 },
  keyId: 'key-1',
  epoch: 1,
  payloadHash: 'hash',
  payload: 'sealed',
  signature: 'signed',
  ...overrides,
});

/** A coordinator offering one realtime provider, and a record of what it sent. */
const fakeCoordinator = (transportCeiling?: number) => {
  const sent: { scope: string; message: CatchUpMessage }[] = [];
  const closed: string[] = [];
  const created: string[] = [];
  const listeners = new Map<string, (bytes: Uint8Array) => void>();
  const coordinator = {
    provider: (id: string) =>
      id === PROVIDER
        ? {
            realtime: {
              createTransport: ({ accessScopeId }: { accessScopeId: string }) => {
                created.push(accessScopeId);
                return Promise.resolve({
                  sharesStore: false,
                  maxMessageBytes: transportCeiling,
                  send: (bytes: Uint8Array) => {
                    sent.push({
                      scope: accessScopeId,
                      message: decodeCatchUpMessage(bytes),
                    });
                  },
                  onMessage: (callback: (bytes: Uint8Array) => void) => {
                    listeners.set(accessScopeId, callback);
                    return () => {
                      listeners.delete(accessScopeId);
                    };
                  },
                  close: () => closed.push(accessScopeId),
                });
              },
            },
          }
        : undefined,
  } as unknown as SyncCoordinator;
  return {
    coordinator,
    sent,
    closed,
    created,
    receive: (scope: string, message: CatchUpMessage) => {
      listeners.get(scope)?.(encodeCatchUpMessage(message));
    },
  };
};

const start = (peer: ReturnType<typeof fakeCoordinator>) =>
  startLivePeerSync({
    db,
    coordinator: peer.coordinator,
    providerId: PROVIDER,
    deviceId: () => Promise.resolve(HERE),
  });

const attachment = (): NoteAttachment => ({
  accessScopeId: 'space-1',
  createdBy: asPrincipalId('me'),
  updatedBy: asPrincipalId('me'),
  mutationId: asOperationId('op-a1'),
  logicalUpdatedAt: { millis: 1_700_000_000_000, counter: 0 },
  id: 'attachment-1',
  noteId: 'note-1',
  spaceId: 'space-1',
  name: 'figure.png',
  mime: 'image/png',
  size: 3,
  blob: new Blob([new ArrayBuffer(3)], { type: 'image/png' }),
  createdAt: 1_700_000_000_000,
});

beforeEach(async () => {
  db = new LoremDB('live-peer-sync');
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe('startLivePeerSync', () => {
  it('sends a frame this device journals to the connected peer', async () => {
    const peer = fakeCoordinator();
    const stop = start(peer);

    await db.syncOperations.put(frameOf());

    await vi.waitFor(() => {
      expect(peer.sent).toEqual([
        {
          scope: 'space-1',
          message: { v: 1, kind: 'frames', frames: [frameOf()], final: true },
        },
      ]);
    });
    stop();
  });

  it('skips a frame the transport cannot carry rather than throwing at it', async () => {
    const peer = fakeCoordinator(1_000);
    const stop = start(peer);

    await db.syncOperations.put(frameOf({ payload: 'p'.repeat(4_000) }));
    await db.syncOperations.put(frameOf({ operationId: asOperationId('op-fits') }));

    // The oversized frame stays in the journal; only the one that fits crosses.
    await vi.waitFor(() => {
      expect(peer.sent).toHaveLength(1);
      expect(peer.sent[0]?.message).toMatchObject({
        kind: 'frames',
        frames: [{ operationId: 'op-fits' }],
      });
    });
    stop();
  });

  it('offers and serves the chunks for a locally authored attachment frame', async () => {
    const peer = fakeCoordinator();
    const stop = start(peer);
    await db.noteAttachments.put(attachment());
    await db.syncAttachmentChunks.put({
      attachmentId: 'attachment-1',
      index: 0,
      accessScopeId: 'space-1',
      bytes: toBase64(new Uint8Array([1, 2, 3])),
    });
    await db.syncOperations.put(
      frameOf({
        entityTable: 'noteAttachments',
        entityId: 'attachment-1',
      }),
    );

    await vi.waitFor(() => {
      expect(peer.sent.map(({ message }) => message.kind)).toEqual([
        'frames',
        'attachment-offer',
      ]);
    });
    peer.receive('space-1', {
      v: 1,
      kind: 'attachment-request',
      attachmentId: 'attachment-1',
      indices: [0],
    });
    await vi.waitFor(() => {
      expect(peer.sent.at(-1)?.message).toMatchObject({
        kind: 'attachment-chunk',
        chunk: { attachmentId: 'attachment-1', index: 0 },
      });
    });
    stop();
  });

  it('never echoes a frame that came from the peer', async () => {
    const peer = fakeCoordinator();
    const stop = start(peer);

    await db.syncOperations.put(frameOf({ deviceId: asDeviceId(THERE) }));

    // The device it came from already holds it; sending it back would spend the
    // connection restating what both ends have.
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(peer.sent).toEqual([]);
    stop();
  });

  it('opens one transport per scope, not one per frame', async () => {
    const peer = fakeCoordinator();
    const stop = start(peer);

    await db.syncOperations.put(frameOf());
    await db.syncOperations.put(frameOf({ operationId: asOperationId('op-2') }));
    await db.syncOperations.put(
      frameOf({ operationId: asOperationId('op-3'), accessScopeId: 'space-2' }),
    );

    await vi.waitFor(() => {
      expect(peer.sent).toHaveLength(3);
    });
    // A channel per frame would open one per keystroke.
    expect(peer.created.sort()).toEqual(['space-1', 'space-2']);
    stop();
  });

  it('stops sending, and releases its transports, when it is stopped', async () => {
    const peer = fakeCoordinator();
    const stop = start(peer);
    await db.syncOperations.put(frameOf());
    await vi.waitFor(() => {
      expect(peer.sent).toHaveLength(1);
    });

    stop();
    await db.syncOperations.put(frameOf({ operationId: asOperationId('op-later') }));

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(peer.sent).toHaveLength(1);
    expect(peer.closed).toEqual(['space-1']);
  });

  it('does nothing at all when no peer provider is configured', async () => {
    const stop = startLivePeerSync({
      db,
      coordinator: { provider: () => undefined } as unknown as SyncCoordinator,
      providerId: PROVIDER,
      deviceId: () => Promise.resolve(HERE),
    });

    await db.syncOperations.put(frameOf());

    stop();
  });
});
