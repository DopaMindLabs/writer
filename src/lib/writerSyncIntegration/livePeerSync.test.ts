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
  /** Every bearer handed out, in order, each able to report itself gone. */
  const handles: { scope: string; die: () => void }[] = [];
  let refuseNext = false;
  const coordinator = {
    provider: (id: string) =>
      id === PROVIDER
        ? {
            realtime: {
              createTransport: ({ accessScopeId }: { accessScopeId: string }) => {
                if (refuseNext) {
                  refuseNext = false;
                  return Promise.reject(new Error('no peer session to open a channel on'));
                }
                created.push(accessScopeId);
                const closers = new Set<() => void>();
                handles.push({
                  scope: accessScopeId,
                  die: () => {
                    for (const closer of [...closers]) closer();
                  },
                });
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
                  onClosed: (callback: () => void) => {
                    closers.add(callback);
                    return () => {
                      closers.delete(callback);
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
    handles,
    /** Refuse the next request for a bearer, as a dead peer session would. */
    refuseNext: () => {
      refuseNext = true;
    },
    receive: (scope: string, message: CatchUpMessage) => {
      listeners.get(scope)?.(encodeCatchUpMessage(message));
    },
  };
};

const start = (
  peer: ReturnType<typeof fakeCoordinator>,
  hasPeer: () => boolean = () => true,
) =>
  startLivePeerSync({
    db,
    coordinator: peer.coordinator,
    providerId: PROVIDER,
    deviceId: () => Promise.resolve(HERE),
    hasPeer,
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
  it('asks for no link at all while nothing is paired', async () => {
    // Asking parks the continuation on a peer that may never arrive, and it
    // holds the frame's ciphertext while it waits — one per save, for as long
    // as the page lives. A device that is cloud-only or simply alone writes
    // all day and never has a peer to give them to.
    const peer = fakeCoordinator();
    const stop = start(peer, () => false);

    await db.syncOperations.put(frameOf());
    await db.syncOperations.put(frameOf({ operationId: asOperationId('op-2') }));
    await vi.waitFor(() => {
      expect(db.syncOperations.count()).resolves.toBe(2);
    });

    // The frames are journalled; catch-up carries them to whoever connects.
    expect(peer.created).toEqual([]);
    expect(peer.sent).toEqual([]);
    stop();
  });

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

  it('sends nothing for a frame whose transaction rolled back', async () => {
    // The hook fires while the transaction is still open, so a frame that never
    // commits locally used to reach the peer anyway — it would journal and
    // materialise an operation this device does not have, and the two would
    // disagree with nothing to reconcile them.
    const peer = fakeCoordinator();
    const stop = start(peer);

    await expect(
      db.transaction('rw', db.syncOperations, async () => {
        await db.syncOperations.put(frameOf());
        throw new Error('rolled back');
      }),
    ).rejects.toThrow('rolled back');

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(peer.sent).toEqual([]);
    // Not even a bearer: opening one asks the peer session for a channel, which
    // is already a side effect of a write that did not happen.
    expect(peer.created).toEqual([]);
    expect(await db.syncOperations.get('op-1')).toBeUndefined();
    stop();
  });

  it('offers no attachment chunks for a transaction that rolled back', async () => {
    const peer = fakeCoordinator();
    const stop = start(peer);
    await db.noteAttachments.put(attachment());

    await expect(
      db.transaction('rw', db.syncOperations, async () => {
        await db.syncOperations.put(
          frameOf({ entityTable: 'noteAttachments', entityId: 'attachment-1' }),
        );
        throw new Error('rolled back');
      }),
    ).rejects.toThrow('rolled back');

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(peer.sent).toEqual([]);
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

  it('opens a fresh bearer once the one it was keeping has gone', async () => {
    // A transport is made once per scope and kept, so a connection that drops
    // used to leave every later frame written into a channel that was gone —
    // the device reported itself synced and threw on each keystroke.
    const peer = fakeCoordinator();
    const stop = start(peer);

    await db.syncOperations.put(frameOf());
    await vi.waitFor(() => {
      expect(peer.sent).toHaveLength(1);
    });

    peer.handles[0].die();
    await db.syncOperations.put(frameOf({ operationId: asOperationId('op-2') }));

    await vi.waitFor(() => {
      expect(peer.created).toEqual(['space-1', 'space-1']);
      expect(peer.sent).toHaveLength(2);
    });
    stop();
  });

  it('lets go of the bearer it drops', async () => {
    const peer = fakeCoordinator();
    const stop = start(peer);

    await db.syncOperations.put(frameOf());
    await vi.waitFor(() => {
      expect(peer.sent).toHaveLength(1);
    });

    peer.handles[0].die();

    await vi.waitFor(() => {
      expect(peer.closed).toEqual(['space-1']);
    });
    stop();
  });

  it('asks again after a bearer it could not open at all', async () => {
    // A refusal used to be kept as readily as a bearer: the rejected promise
    // stayed in the cache and every later frame was answered with it.
    const peer = fakeCoordinator();
    const stop = start(peer);
    peer.refuseNext();

    await db.syncOperations.put(frameOf());
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(peer.sent).toHaveLength(0);

    await db.syncOperations.put(frameOf({ operationId: asOperationId('op-2') }));

    await vi.waitFor(() => {
      expect(peer.sent).toHaveLength(1);
    });
    stop();
  });

  it('keeps the bearer it has when an older one reports itself gone late', async () => {
    const peer = fakeCoordinator();
    const stop = start(peer);

    await db.syncOperations.put(frameOf());
    await vi.waitFor(() => {
      expect(peer.sent).toHaveLength(1);
    });
    peer.handles[0].die();
    await db.syncOperations.put(frameOf({ operationId: asOperationId('op-2') }));
    await vi.waitFor(() => {
      expect(peer.created).toHaveLength(2);
    });

    // The one that already went reports it again; the live one must survive.
    peer.handles[0].die();
    await db.syncOperations.put(frameOf({ operationId: asOperationId('op-3') }));

    await vi.waitFor(() => {
      expect(peer.sent).toHaveLength(3);
    });
    expect(peer.created).toHaveLength(2);
    stop();
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
