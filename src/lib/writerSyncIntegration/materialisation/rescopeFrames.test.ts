import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Dexie from 'dexie';
import { LoremDB } from '@/db/LoremDB';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import * as ids from '@/lib/ids';
import {
  asDeviceId, asOperationId, asPrincipalId, compareTimestamps, MAX_OBSERVED_DRIFT_MILLIS,
  TrustedDeviceStatus, type DeviceId,
} from 'writer-sync/core';
import type {
  DeviceIdentityKeys,
  ScopeKeyContext,
  ScopeKeyResolver,
  SyncKeyRing,
} from 'writer-sync/crypto';
import {
  generateDeviceIdentity,
  openOperationPayload,
  publicJwkOf,
  signFrame,
  verifyFrameSignature,
} from 'writer-sync/crypto';
import { compareOperations, verifyFrame } from 'writer-sync/operations';
import { createTrustedDeviceStore } from '@/lib/writerSyncIntegration/trustedDeviceStore';
import { writerClock } from '@/lib/writerSyncIntegration/writerLogicalClock';
import { createWriterFrameVerifier } from './writerFrameVerifier';
import type { JournalIdentity } from './operationJournalMiddleware';
import { rescopeFrames } from './rescopeFrames';
import { makeDeleteFrame, makePutFrame } from './writerOperationFactory';
import { applyInboundFrame } from './writerOperationMaterialiser';

/**
 * A scope transition must re-encrypt, not relabel: the scope id is bound into
 * each frame's additional authenticated data, so a moved frame that kept its old
 * envelope would be unopenable — the operation would be silently lost.
 */

/** The device that authored the frames before the move. */
const DEVICE = asDeviceId('device-a');
/** The device performing the move, which re-authors what it reseals. */
const THIS_DEVICE = asDeviceId('device-b');

let identityKeys: DeviceIdentityKeys;
let sourceIdentityKeys: DeviceIdentityKeys;
const identity = (): Promise<JournalIdentity> =>
  Promise.resolve({ deviceId: THIS_DEVICE, privateKey: identityKeys.privateKey });

/** What this device accepts as an author is `writerFrameVerifier.test.ts`. */
const acceptAnyAuthor = (): Promise<boolean> => Promise.resolve(true);

let db: LoremDB;
let scopeKeys: Map<string, SyncKeyRing>;

const resolver: ScopeKeyResolver = {
  keyFor: (context: ScopeKeyContext) => scopeKeys.get(context.accessScopeId) ?? null,
  hasAnyKey: () => scopeKeys.size > 0,
};

const note = (overrides: Partial<Note> = {}): Note => ({
  accessScopeId: 'space-a',
  createdBy: asPrincipalId('me'),
  updatedBy: asPrincipalId('me'),
  mutationId: asOperationId('op-n1-1'),
  logicalUpdatedAt: { millis: 1000, counter: 0 },
  id: 'n1',
  spaceId: 'space-a',
  l: 24,
  t: 24,
  w: 184,
  h: 80,
  kind: NoteKind.Note,
  state: NoteState.User,
  body: 'secret body',
  createdAt: 1000,
  ...overrides,
});

const enqueuePut = async (row: Note): Promise<void> => {
  const ring = scopeKeys.get(row.accessScopeId);
  if (!ring) throw new Error('test setup: no key for scope');
  const frame = await makePutFrame({ ring, deviceId: DEVICE, entityTable: 'notes', row });
  await db.syncOperations.put({
    ...frame,
    signature: await signFrame(sourceIdentityKeys.privateKey, frame),
  });
  // A local edit is already saved before its frame is sent to peers.
  await db.notes.put(row);
  await db.syncTombstones.delete(['notes', row.id]);
};

const movedFrame = async () =>
  verifyFrame(await db.syncOperations.where({ accessScopeId: 'space-b' }).first(), {
    expectedScope: 'space-b',
  });

const trustAuthor = async (deviceId: DeviceId, publicKey: CryptoKey): Promise<void> => {
  await createTrustedDeviceStore(db).trust({
    deviceId, publicIdentityJwk: await publicJwkOf(publicKey),
    principalId: asPrincipalId('me'), status: TrustedDeviceStatus.Active,
    addedAt: 1000, lastSessionAt: 1000, displayName: 'Test device',
    acknowledgedOperations: {},
  });
};

const applyDestinations = async (): Promise<void> => {
  const frames = await db.syncOperations.where({ accessScopeId: 'space-b' }).toArray();
  for (const frame of frames) {
    await applyInboundFrame({
      db, frame, ring: scopeKeys.get('space-b')!, verifySignature: createWriterFrameVerifier(db),
    });
  }
};

beforeEach(async () => {
  const master = generateRootSecret();
  scopeKeys = new Map([
    ['space-a', await deriveKeyRing(master, 1)],
    ['space-b', await deriveKeyRing(generateRootSecret(), 1)],
  ]);
  identityKeys = await generateDeviceIdentity();
  sourceIdentityKeys = await generateDeviceIdentity();
  db = new LoremDB('rescope-frames');
  await db.open();
  await trustAuthor(DEVICE, sourceIdentityKeys.publicKey);
  await trustAuthor(THIS_DEVICE, identityKeys.publicKey);
});

afterEach(async () => {
  await db.delete();
});

describe('rescopeFrames', () => {
  it.each(['newer', 'tied', 'missing'] as const)(
    'refuses an unapplied %s version before obtaining the signing identity', async (version) => {
      const current = note();
      await enqueuePut(current);
      if (version === 'missing') await db.notes.clear();
      const frame = await makePutFrame({ ring: scopeKeys.get('space-a')!, deviceId: DEVICE,
        entityTable: 'notes', row: note({ mutationId: asOperationId('pending-edit'),
          logicalUpdatedAt: version === 'newer' ? writerClock.now() : current.logicalUpdatedAt }) });
      await db.syncOperations.put({ ...frame,
        signature: await signFrame(sourceIdentityKeys.privateKey, frame) });
      const signingIdentity = vi.fn(identity);
      await expect(rescopeFrames({ requestId: 'move-a-b', db, resolver,
        identity: signingIdentity, scopes: { from: 'space-a', to: 'space-b' },
      })).rejects.toThrow(/pending operations/);
      expect(signingIdentity).not.toHaveBeenCalled();
      expect(await db.syncScopeRebindings.count()).toBe(0);
    },
  );

  it.each(['identity', 'time', 'metadata'] as const)(
    'refuses malformed current-row %s after compaction', async (field) => {
      const row = note();
      const malformed = field === 'identity' ? { ...row, mutationId: '' }
        : field === 'time' ? { ...row, logicalUpdatedAt: { millis: 1, counter: NaN } }
          : { ...row, createdBy: null };
      await db.table('notes').put(malformed);
      await expect(rescopeFrames({ requestId: 'move-a-b', db, resolver, identity,
        scopes: { from: 'space-a', to: 'space-b' },
      })).rejects.toThrow(/invalid/i);
      expect(await db.syncOperations.count()).toBe(0);
      expect(await db.syncScopeRebindings.count()).toBe(0);
    },
  );

  it('refuses a missing retained deletion frame instead of inventing a new deletion', async () => {
    await db.syncTombstones.put({ entityTable: 'notes', entityId: 'n1', accessScopeId: 'space-a',
      operationId: asOperationId('missing-delete'), deviceId: DEVICE,
      logicalAt: { millis: 1000, counter: 0 }, acknowledgedBy: [] });
    await expect(rescopeFrames({ requestId: 'move-a-b', db, resolver, identity,
      scopes: { from: 'space-a', to: 'space-b' },
    })).rejects.toThrow(/retained signed frame/);
    expect(await db.syncOperations.count()).toBe(0);
    expect(await db.syncScopeRebindings.count()).toBe(0);
  });

  it('refuses contradictory current live and deleted state', async () => {
    await enqueuePut(note());
    await db.syncTombstones.put({ entityTable: 'notes', entityId: 'n1', accessScopeId: 'space-a',
      operationId: asOperationId('delete'), deviceId: DEVICE,
      logicalAt: { millis: 1000, counter: 0 }, acknowledgedBy: [] });
    await expect(rescopeFrames({ requestId: 'move-a-b', db, resolver, identity,
      scopes: { from: 'space-a', to: 'space-b' },
    })).rejects.toThrow(/both a row and its tombstone/);
    expect(await db.syncScopeRebindings.count()).toBe(0);
  });

  it('rejects an empty request identity', async () => {
    await expect(rescopeFrames({ requestId: ' ', db, resolver, identity,
      scopes: { from: 'space-a', to: 'space-b' },
    })).rejects.toThrow(/request id/);
  });

  it('atomically moves the current row even when its entire journal has been compacted', async () => {
    await enqueuePut(note());
    await db.syncOperations.clear();
    expect(await rescopeFrames({
      requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' },
    })).toBe(1);
    const moved = await movedFrame();
    expect(await db.notes.get('n1')).toMatchObject({
      accessScopeId: 'space-b', mutationId: moved.operationId, body: 'secret body',
    });
    expect(await db.syncInbox.get(String(moved.operationId))).toMatchObject({ result: 'applied' });
  });

  it('rejects a changed saved version even if no new journal frame remains', async () => {
    await enqueuePut(note());
    await expect(rescopeFrames({
      requestId: 'move-a-b', db, resolver, scopes: { from: 'space-a', to: 'space-b' },
      identity: async () => {
        await db.notes.put(note({ body: 'concurrent accepted edit',
          mutationId: asOperationId('accepted-edit'), logicalUpdatedAt: writerClock.now() }));
        return identity();
      },
    })).rejects.toThrow(/changed during/);
    expect((await db.notes.get('n1'))?.body).toBe('concurrent accepted edit');
    expect(await db.syncOperations.where({ accessScopeId: 'space-b' }).count()).toBe(0);
    expect(await db.syncScopeRebindings.count()).toBe(0);
  });

  it('does not repeat an old request after a later move brings content back', async () => {
    await enqueuePut(note());
    const move = { requestId: 'move-a-b', db, resolver, identity,
      scopes: { from: 'space-a', to: 'space-b' } };
    await rescopeFrames(move);
    await rescopeFrames({ ...move, requestId: 'move-back',
      scopes: { from: 'space-b', to: 'space-a' } });
    const before = await db.syncOperations.toArray();
    expect(await rescopeFrames(move)).toBe(0);
    expect((await db.notes.get('n1'))?.accessScopeId).toBe('space-a');
    expect(await db.syncOperations.toArray()).toEqual(before);
  });

  it('refuses reuse of a completed request id for different scopes', async () => {
    await enqueuePut(note());
    const move = { requestId: 'move-a-b', db, resolver, identity,
      scopes: { from: 'space-a', to: 'space-b' } };
    await rescopeFrames(move);
    await expect(rescopeFrames({ ...move,
      scopes: { from: 'space-b', to: 'space-a' } })).rejects.toThrow(/request id/);
  });

  it('re-encrypts a moved frame so the destination scope can open it', async () => {
    await enqueuePut(note());

    expect(
      await rescopeFrames({ requestId: 'move-a-b',
        db,
        resolver,
        identity,
        scopes: { from: 'space-a', to: 'space-b' },
      }),
    ).toBe(1);

    const moved = await movedFrame();
    expect(moved.operationId).not.toBe('op-n1-1');
    expect(compareTimestamps(moved.logicalAt, note().logicalUpdatedAt)).toBeGreaterThan(0);
    // The payload opens under the destination key — a relabelled envelope would
    // fail here, because the scope is bound into the AAD.
    const content = await openOperationPayload(
      scopeKeys.get('space-b')!,
      moved,
      moved.payload,
    );
    expect(content).toEqual({
      ...note(),
      accessScopeId: 'space-b',
      mutationId: moved.operationId,
      logicalUpdatedAt: moved.logicalAt,
    });
  });

  it('re-authors a moved frame so its signature verifies against this device', async () => {
    await enqueuePut(note());
    await rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' } });

    const moved = await movedFrame();
    expect(moved.deviceId).toBe(THIS_DEVICE);
    expect(await verifyFrameSignature(identityKeys.publicKey, moved)).toBe(true);
  });

  it('leaves the moved frame unopenable under the source key', async () => {
    await enqueuePut(note());
    await rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' } });

    const moved = await movedFrame();
    await expect(
      openOperationPayload(scopeKeys.get('space-a')!, moved, moved.payload),
    ).rejects.toThrow();
  });

  it('materialises a moved frame into the destination scope', async () => {
    await enqueuePut(note());
    await rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' } });

    const moved = await movedFrame();
    expect(
      await applyInboundFrame({
        db,
        frame: moved,
        ring: scopeKeys.get('space-b')!,
        verifySignature: acceptAnyAuthor,
      }),
    ).toBe('applied');
    expect(await db.notes.get('n1')).toMatchObject({
      body: 'secret body',
      accessScopeId: 'space-b',
      mutationId: moved.operationId,
      logicalUpdatedAt: moved.logicalAt,
    });
  });

  it('preserves the original signed frame and existing destination history', async () => {
    await enqueuePut(note());
    await enqueuePut(note({
      id: 'n2',
      accessScopeId: 'space-b',
      mutationId: asOperationId('op-n2-1'),
    }));
    const original = await db.syncOperations.get('op-n1-1');
    const destination = await db.syncOperations.get('op-n2-1');

    expect(
      await rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' } }),
    ).toBe(1);

    expect(await db.syncOperations.get('op-n1-1')).toEqual(original);
    expect(await db.syncOperations.get('op-n2-1')).toEqual(destination);
    expect(await db.syncOperations.count()).toBe(3);
  });

  it.each(['before', 'after'] as const)(
    'converges with a fresh peer when another peer receives the original %s the move',
    async (arrival) => {
      const existing = new LoremDB('rescope-existing-peer');
      const fresh = new LoremDB('rescope-fresh-peer');
      try {
        await enqueuePut(note());
        const original = await verifyFrame(await db.syncOperations.get('op-n1-1'));
        const applyOriginal = () => applyInboundFrame({
          db: existing, frame: original, ring: scopeKeys.get('space-a')!,
          verifySignature: (frame) => verifyFrameSignature(sourceIdentityKeys.publicKey, frame),
        });
        if (arrival === 'before') {
          expect(await applyOriginal()).toBe('applied');
          expect((await existing.notes.get('n1'))?.accessScopeId).toBe('space-a');
        }

        await rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' } });
        const moved = await movedFrame();
        for (const peer of [existing, fresh]) {
          expect(await applyInboundFrame({
            db: peer, frame: moved, ring: scopeKeys.get('space-b')!,
            verifySignature: (frame) => verifyFrameSignature(identityKeys.publicKey, frame),
          })).toBe('applied');
        }
        if (arrival === 'after') expect(await applyOriginal()).toBe('superseded');

        const expected = {
          ...note(), accessScopeId: 'space-b',
          mutationId: moved.operationId, logicalUpdatedAt: moved.logicalAt,
        };
        expect(await existing.notes.get('n1')).toEqual(expected);
        expect(await fresh.notes.get('n1')).toEqual(expected);
        expect(await existing.syncInbox.count()).toBe(2);
        expect(await fresh.syncInbox.count()).toBe(1);

        expect(await applyInboundFrame({
          db: existing, frame: moved, ring: scopeKeys.get('space-b')!,
          verifySignature: (frame) => verifyFrameSignature(identityKeys.publicKey, frame),
        })).toBe('applied');
        expect(await existing.notes.get('n1')).toEqual(expected);
        expect(await existing.syncInbox.count()).toBe(2);
      } finally {
        await existing.delete();
        await fresh.delete();
      }
    },
  );

  it('preserves conflict order when source devices tie and journal keys sort differently', async () => {
    const logicalUpdatedAt = { millis: Date.now() + 60_000, counter: 10 };
    const rows = [
      note({ mutationId: asOperationId('z-earlier'), logicalUpdatedAt, body: 'earlier' }),
      note({ mutationId: asOperationId('a-later'), logicalUpdatedAt, body: 'later' }),
    ];
    const originals = await Promise.all(rows.map((row, index) => makePutFrame({
      ring: scopeKeys.get('space-a')!, entityTable: 'notes', row,
      deviceId: asDeviceId(index === 0 ? 'device-a' : 'device-z'),
    })));
    await trustAuthor(asDeviceId('device-z'), sourceIdentityKeys.publicKey);
    const signed = await Promise.all(originals.map(async (frame) => ({
      ...frame, signature: await signFrame(sourceIdentityKeys.privateKey, frame),
    })));
    for (const frame of signed) {
      await applyInboundFrame({
        db, frame, ring: scopeKeys.get('space-a')!, verifySignature: createWriterFrameVerifier(db),
      });
    }
    expect((await db.notes.get('n1'))?.body).toBe('later');

    await rescopeFrames({ requestId: 'move-a-b', db, resolver, identity,
      scopes: { from: 'space-a', to: 'space-b' } });
    const moved = (await db.syncOperations.where({ accessScopeId: 'space-b' }).toArray())
      .sort(compareOperations);
    // Move the accepted winner once; replaying both old versions is not a move.
    expect(moved).toHaveLength(1);
    const frame = moved[0];
    expect(rows.map((row) => row.mutationId)).not.toContain(frame.operationId);
    expect(compareTimestamps(frame.logicalAt, logicalUpdatedAt)).toBeGreaterThan(0);
    expect(await openOperationPayload(scopeKeys.get('space-b')!, frame, frame.payload))
      .toMatchObject({ body: 'later', mutationId: frame.operationId });
  });

  it('moves a delete frame by header alone', async () => {
    const ring = scopeKeys.get('space-a')!;
    const unsigned = makeDeleteFrame({
      ring,
      deviceId: DEVICE,
      entityTable: 'notes',
      entityId: 'n1',
      accessScopeId: 'space-a',
    });
    const original = {
      ...unsigned, signature: await signFrame(sourceIdentityKeys.privateKey, unsigned),
    };
    await db.syncOperations.put(original);
    expect(await applyInboundFrame({
      db, frame: original, ring, verifySignature: acceptAnyAuthor,
    })).toBe('applied');

    expect(
      await rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' } }),
    ).toBe(1);
    const moved = await movedFrame();
    expect(moved.accessScopeId).toBe('space-b');
    expect(moved.operationId).not.toBe(original.operationId);
    expect(compareTimestamps(moved.logicalAt, original.logicalAt)).toBeGreaterThan(0);
    expect(await db.syncOperations.get(String(original.operationId))).toEqual(original);
    await expect(verifyFrame(moved, { expectedScope: 'space-b' })).resolves.toBeDefined();
    // A deletion has no payload to reseal, but its header moved, so it is
    // re-signed all the same.
    expect(await verifyFrameSignature(identityKeys.publicKey, moved)).toBe(true);
    expect(await applyInboundFrame({
      db, frame: moved, ring: scopeKeys.get('space-b')!,
      verifySignature: (frame) => verifyFrameSignature(identityKeys.publicKey, frame),
    })).toBe('applied');
    expect(await db.syncTombstones.get(['notes', 'n1'])).toMatchObject({
      accessScopeId: 'space-b', operationId: moved.operationId, logicalAt: moved.logicalAt,
    });
    expect(await db.syncInbox.count()).toBe(2);
  });

  it('rolls back entirely when one frame cannot be resealed', async () => {
    await enqueuePut(note());
    await enqueuePut(note({ id: 'n2', mutationId: asOperationId('op-n2-1') }));
    // Corrupt one payload: it can no longer be opened, so the transition must
    // abort rather than move half the scope's history.
    const broken = await db.syncOperations.get('op-n2-1');
    if (!broken) throw new Error('test setup: frame missing');
    await db.syncOperations.put({ ...broken, payload: btoa('not-ciphertext') });

    await expect(
      rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' } }),
    ).rejects.toThrow();

    // Both frames are still in the source scope: nothing was half-moved.
    const scopes = (await db.syncOperations.toArray()).map((f) => f.accessScopeId);
    expect(scopes).toEqual(['space-a', 'space-a']);
  });

  it('rolls back the batch when fresh operation ids collide', async () => {
    await enqueuePut(note());
    await enqueuePut(note({ id: 'n2', mutationId: asOperationId('op-n2-1') }));
    const originals = await db.syncOperations.toArray();
    vi.spyOn(ids, 'newId').mockReturnValue('duplicate-rescope-id');

    await expect(
      rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' } }),
    ).rejects.toThrow();
    expect(await db.syncOperations.toArray()).toEqual(originals);
  });

  it('leaves the journal unchanged when signing fails', async () => {
    await enqueuePut(note());
    const originals = await db.syncOperations.toArray();

    await expect(rescopeFrames({ requestId: 'move-a-b',
      db, resolver, scopes: { from: 'space-a', to: 'space-b' },
      identity: () => Promise.resolve({ deviceId: THIS_DEVICE, privateKey: identityKeys.publicKey }),
    })).rejects.toThrow();
    expect(await db.syncOperations.toArray()).toEqual(originals);
  });

  it('refuses a source clock beyond the accepted drift without writing destination frames', async () => {
    await enqueuePut(note({
      logicalUpdatedAt: { millis: Date.now() + MAX_OBSERVED_DRIFT_MILLIS + 10_000, counter: 0 },
    }));
    const originals = await db.syncOperations.toArray();

    await expect(
      rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' } }),
    ).rejects.toThrow(/drift/);
    expect(await db.syncOperations.toArray()).toEqual(originals);
  });

  it.each(['space-a', 'space-b'])('refuses when the %s scope key is unavailable', async (scope) => {
    await enqueuePut(note());
    scopeKeys.delete(scope);

    await expect(
      rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' } }),
    ).rejects.toThrow(/scope keys must be available/);
    expect((await db.syncOperations.get('op-n1-1'))?.accessScopeId).toBe('space-a');
  });

  it('is a no-op when the scope does not change or holds no frames', async () => {
    await enqueuePut(note());
    scopeKeys.set('space-c', await deriveKeyRing(generateRootSecret(), 1));
    expect(
      await rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'space-a', to: 'space-a' } }),
    ).toBe(0);
    expect(
      await rescopeFrames({ requestId: 'empty-move', db, resolver, identity, scopes: { from: 'space-c', to: 'space-b' } }),
    ).toBe(0);
  });

  it('keeps destination edits when a completed move is repeated after reopening the database', async () => {
    await enqueuePut(note());
    await rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' } });
    await applyDestinations();
    await enqueuePut(note({
      accessScopeId: 'space-b', body: 'new destination edit',
      mutationId: asOperationId('destination-edit'), logicalUpdatedAt: writerClock.now(),
    }));
    await applyDestinations();
    const before = await db.syncOperations.toArray();
    db.close();
    db = new LoremDB('rescope-frames');
    await db.open();

    expect(await rescopeFrames({ requestId: 'move-a-b',
      db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' },
    })).toBe(0);
    await applyDestinations();
    expect((await db.notes.get('n1'))?.body).toBe('new destination edit');
    expect(await db.syncOperations.toArray()).toEqual(before);
  });

  it('does not re-author stale history when a newer operation already moved the entity', async () => {
    await enqueuePut(note());
    await enqueuePut(note({
      accessScopeId: 'space-b', body: 'already moved and edited',
      mutationId: asOperationId('other-device-move'), logicalUpdatedAt: writerClock.now(),
    }));
    await applyDestinations();
    const before = await db.syncOperations.toArray();

    expect(await rescopeFrames({ requestId: 'move-a-b',
      db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' },
    })).toBe(0);
    expect(await db.syncOperations.toArray()).toEqual(before);
    expect((await db.notes.get('n1'))?.body).toBe('already moved and edited');
  });

  it('aborts if a source edit arrives during preparation and can then move the fresh snapshot', async () => {
    await enqueuePut(note());
    const edited = note({
      body: 'concurrent source edit', mutationId: asOperationId('concurrent-edit'),
      logicalUpdatedAt: writerClock.now(),
    });
    await expect(rescopeFrames({ requestId: 'move-a-b',
      db, resolver, scopes: { from: 'space-a', to: 'space-b' },
      identity: async () => {
        await enqueuePut(edited);
        await applyInboundFrame({
          db, frame: await db.syncOperations.get('concurrent-edit'),
          ring: scopeKeys.get('space-a')!, verifySignature: createWriterFrameVerifier(db),
        });
        return identity();
      },
    })).rejects.toThrow(/changed during/);
    expect(await db.syncOperations.where({ accessScopeId: 'space-b' }).count()).toBe(0);
    expect((await db.notes.get('n1'))?.body).toBe('concurrent source edit');

    expect(await rescopeFrames({ requestId: 'move-a-b',
      db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' },
    })).toBe(1);
    await applyDestinations();
    expect((await db.notes.get('n1'))?.body).toBe('concurrent source edit');
  });

  it('refuses an unsigned destination frame instead of treating it as a completed move', async () => {
    await enqueuePut(note());
    await db.syncOperations.put(makeDeleteFrame({
      ring: scopeKeys.get('space-b')!, deviceId: DEVICE,
      entityTable: 'notes', entityId: 'n1', accessScopeId: 'space-b',
    }));
    const before = await db.syncOperations.toArray();
    const signingIdentity = vi.fn(identity);

    await expect(rescopeFrames({ requestId: 'move-a-b',
      db, resolver, identity: signingIdentity, scopes: { from: 'space-a', to: 'space-b' },
    })).rejects.toThrow(/trusted identity/);
    expect(signingIdentity).not.toHaveBeenCalled();
    expect(await db.syncOperations.toArray()).toEqual(before);
    expect(await db.syncScopeRebindings.count()).toBe(0);
  });

  it.each(['put', 'delete'] as const)('refuses an unsigned %s without signing a replacement', async (kind) => {
    await enqueuePut(note());
    const original = await verifyFrame(await db.syncOperations.get('op-n1-1'));
    const forged = kind === 'put' ? { ...original, signature: '' } : makeDeleteFrame({
      ring: scopeKeys.get('space-a')!, deviceId: DEVICE,
      entityTable: 'notes', entityId: 'n1', accessScopeId: 'space-a',
    });
    await db.syncOperations.put(forged);
    const before = await db.syncOperations.toArray();
    const signingIdentity = vi.fn(identity);

    await expect(rescopeFrames({ requestId: 'move-a-b',
      db, resolver, identity: signingIdentity, scopes: { from: 'space-a', to: 'space-b' },
    })).rejects.toThrow(/trusted identity/);
    expect(signingIdentity).not.toHaveBeenCalled();
    expect(await db.syncOperations.toArray()).toEqual(before);
  });

  it('refuses a frame signed by a device whose trust has been revoked', async () => {
    await enqueuePut(note());
    await createTrustedDeviceStore(db).revoke({ deviceId: DEVICE, at: Date.now() });
    const before = await db.syncOperations.toArray();
    await expect(rescopeFrames({ requestId: 'move-a-b',
      db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' },
    })).rejects.toThrow(/trusted identity/);
    expect(await db.syncOperations.toArray()).toEqual(before);
  });

  it('retains repeat protection after destination history has been compacted', async () => {
    await enqueuePut(note());
    await rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' } });
    await applyDestinations();
    await db.syncOperations.where({ accessScopeId: 'space-b' }).delete();
    db.close();
    db = new LoremDB('rescope-frames');
    await db.open();

    expect(await rescopeFrames({ requestId: 'move-a-b',
      db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' },
    })).toBe(0);
    expect(await db.syncScopeRebindings.count()).toBe(1);
    expect(await db.syncOperations.count()).toBe(1);
    expect((await db.notes.get('n1'))?.accessScopeId).toBe('space-b');
  });

  it('can move an entity back and forth with a distinct request for each move', async () => {
    await enqueuePut(note());
    expect(await rescopeFrames({ requestId: 'first-move',
      db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' },
    })).toBe(1);
    expect(await rescopeFrames({ requestId: 'move-back',
      db, resolver, identity, scopes: { from: 'space-b', to: 'space-a' },
    })).toBe(1);
    expect(await rescopeFrames({ requestId: 'move-again',
      db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' },
    })).toBe(1);
    expect(await db.syncOperations.count()).toBe(4);
    expect(await db.syncScopeRebindings.count()).toBe(3);
  });

  it('does not double-commit when another database handle completes the same move', async () => {
    await enqueuePut(note());
    const other = new LoremDB('rescope-frames');
    try {
      await expect(rescopeFrames({ requestId: 'move-a-b',
        db, resolver, scopes: { from: 'space-a', to: 'space-b' },
        identity: async () => {
          expect(await rescopeFrames({ requestId: 'move-a-b',
            db: other, resolver, identity, scopes: { from: 'space-a', to: 'space-b' },
          })).toBe(1);
          return identity();
        },
      })).rejects.toThrow(/changed during/);
      expect(await rescopeFrames({ requestId: 'move-a-b',
        db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' },
      })).toBe(0);
      expect(await db.syncOperations.count()).toBe(2);
      expect(await db.syncScopeRebindings.count()).toBe(1);
    } finally {
      other.close();
    }
  });

  it('recognises a request completed between the initial receipt read and the snapshot', async () => {
    await enqueuePut(note());
    const other = new LoremDB('rescope-frames');
    const signingIdentity = vi.fn(identity);
    try {
      // The first read completed before the other handle's commit became visible.
      vi.spyOn(db.syncScopeRebindings, 'get').mockImplementationOnce(() => Dexie.Promise.resolve(
        rescopeFrames({ requestId: 'move-a-b', db: other, resolver, identity,
          scopes: { from: 'space-a', to: 'space-b' } }),
      ).then(() => undefined));
      expect(await rescopeFrames({ requestId: 'move-a-b', db, resolver,
        identity: signingIdentity, scopes: { from: 'space-a', to: 'space-b' } })).toBe(0);
      expect(signingIdentity).not.toHaveBeenCalled();
      expect(await db.syncOperations.count()).toBe(2);
      expect(await db.syncScopeRebindings.count()).toBe(1);
    } finally {
      other.close();
    }
  });

  it('aborts when a destination edit arrives during preparation', async () => {
    await enqueuePut(note());
    await expect(rescopeFrames({ requestId: 'move-a-b',
      db, resolver, scopes: { from: 'space-a', to: 'space-b' },
      identity: async () => {
        await enqueuePut(note({
          accessScopeId: 'space-b', body: 'destination changed during move',
          mutationId: asOperationId('destination-edit'), logicalUpdatedAt: writerClock.now(),
        }));
        return identity();
      },
    })).rejects.toThrow(/changed during/);
    await applyDestinations();
    expect((await db.notes.get('n1'))?.body).toBe('destination changed during move');
    expect(await db.syncScopeRebindings.count()).toBe(0);
  });

  it('rolls back destination frames when writing the repeat-protection receipts fails', async () => {
    await enqueuePut(note());
    const before = await db.syncOperations.toArray();
    const row = await db.notes.get('n1');
    const save = vi.spyOn(db.syncScopeRebindings, 'bulkAdd')
      .mockRejectedValue(new Error('receipt write failed'));
    await expect(rescopeFrames({ requestId: 'move-a-b',
      db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' },
    })).rejects.toThrow('receipt write failed');
    expect(await db.syncOperations.toArray()).toEqual(before);
    expect(await db.syncScopeRebindings.count()).toBe(0);
    expect(await db.notes.get('n1')).toEqual(row);
    expect(await db.syncInbox.count()).toBe(0);
    save.mockRestore();
    expect(await rescopeFrames({ requestId: 'move-a-b',
      db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' },
    })).toBe(1);
  });

  it('does not re-sign operations on local control tables', async () => {
    const frame = makeDeleteFrame({
      ring: scopeKeys.get('space-a')!, deviceId: DEVICE,
      entityTable: 'trustedDevices', entityId: 'peer', accessScopeId: 'space-a',
    });
    await db.syncOperations.put({
      ...frame, signature: await signFrame(sourceIdentityKeys.privateKey, frame),
    });
    await expect(rescopeFrames({ requestId: 'move-a-b',
      db, resolver, identity, scopes: { from: 'space-a', to: 'space-b' },
    })).rejects.toThrow(/does not accept inbound operations/);
    expect(await db.syncScopeRebindings.count()).toBe(0);
    expect(await db.syncOperations.count()).toBe(1);
  });
});
