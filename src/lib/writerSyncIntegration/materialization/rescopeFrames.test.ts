import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import { asDeviceId, asOperationId, asPrincipalId } from 'writer-sync/core';
import type {
  ScopeKeyContext,
  ScopeKeyResolver,
  SyncKeyRing,
} from 'writer-sync/crypto';
import { openOperationPayload } from 'writer-sync/crypto';
import { verifyFrame } from 'writer-sync/operations';
import { rescopeFrames } from './rescopeFrames';
import { makeDeleteFrame, makePutFrame } from './writerOperationFactory';
import { applyInboundFrame } from './writerOperationMaterializer';

/**
 * A scope transition must re-encrypt, not relabel: the scope id is bound into
 * each frame's additional authenticated data, so a moved frame that kept its old
 * envelope would be unopenable — the operation would be silently lost.
 */

const DEVICE = asDeviceId('device-a');

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
  await db.syncOperations.put(
    await makePutFrame({ ring, deviceId: DEVICE, entityTable: 'notes', row }),
  );
};

beforeEach(async () => {
  const master = generateRootSecret();
  scopeKeys = new Map([
    ['space-a', await deriveKeyRing(master, 1)],
    ['space-b', await deriveKeyRing(generateRootSecret(), 1)],
  ]);
  db = new LoremDB('rescope-frames');
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe('rescopeFrames', () => {
  it('re-encrypts a moved frame so the destination scope can open it', async () => {
    await enqueuePut(note());

    expect(
      await rescopeFrames({
        db,
        resolver,
        scopes: { from: 'space-a', to: 'space-b' },
      }),
    ).toBe(1);

    const moved = await verifyFrame(
      await db.syncOperations.get('op-n1-1'),
      { expectedScope: 'space-b' },
    );
    // Identity and ordering survive the move, so deduplication and convergence
    // still recognise the operation.
    expect(moved.operationId).toBe('op-n1-1');
    expect(moved.logicalAt).toEqual({ millis: 1000, counter: 0 });
    // The payload opens under the destination key — a relabelled envelope would
    // fail here, because the scope is bound into the AAD.
    const content = await openOperationPayload(
      scopeKeys.get('space-b')!,
      moved,
      moved.payload,
    );
    expect(content).toMatchObject({ id: 'n1', body: 'secret body' });
  });

  it('leaves the moved frame unopenable under the source key', async () => {
    await enqueuePut(note());
    await rescopeFrames({ db, resolver, scopes: { from: 'space-a', to: 'space-b' } });

    const moved = await verifyFrame(await db.syncOperations.get('op-n1-1'));
    await expect(
      openOperationPayload(scopeKeys.get('space-a')!, moved, moved.payload),
    ).rejects.toThrow();
  });

  it('materialises a moved frame into the destination scope', async () => {
    await enqueuePut(note());
    await rescopeFrames({ db, resolver, scopes: { from: 'space-a', to: 'space-b' } });

    const moved = await db.syncOperations.get('op-n1-1');
    expect(
      await applyInboundFrame({
        db,
        frame: moved,
        ring: scopeKeys.get('space-b')!,
        verifySignature: acceptAnyAuthor,
      }),
    ).toBe('applied');
    expect((await db.notes.get('n1'))?.body).toBe('secret body');
  });

  it('moves a delete frame by header alone', async () => {
    const ring = scopeKeys.get('space-a')!;
    await db.syncOperations.put(
      makeDeleteFrame({
        ring,
        deviceId: DEVICE,
        entityTable: 'notes',
        entityId: 'n1',
        accessScopeId: 'space-a',
      }),
    );

    expect(
      await rescopeFrames({ db, resolver, scopes: { from: 'space-a', to: 'space-b' } }),
    ).toBe(1);
    const [moved] = await db.syncOperations.toArray();
    expect(moved.accessScopeId).toBe('space-b');
    await expect(verifyFrame(moved, { expectedScope: 'space-b' })).resolves.toBeDefined();
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
      rescopeFrames({ db, resolver, scopes: { from: 'space-a', to: 'space-b' } }),
    ).rejects.toThrow();

    // Both frames are still in the source scope: nothing was half-moved.
    const scopes = (await db.syncOperations.toArray()).map((f) => f.accessScopeId);
    expect(scopes).toEqual(['space-a', 'space-a']);
  });

  it('refuses when the destination scope key is unavailable', async () => {
    await enqueuePut(note());
    scopeKeys.delete('space-b');

    await expect(
      rescopeFrames({ db, resolver, scopes: { from: 'space-a', to: 'space-b' } }),
    ).rejects.toThrow(/scope keys must be available/);
    expect((await db.syncOperations.get('op-n1-1'))?.accessScopeId).toBe('space-a');
  });

  it('is a no-op when the scope does not change or holds no frames', async () => {
    await enqueuePut(note());
    expect(
      await rescopeFrames({ db, resolver, scopes: { from: 'space-a', to: 'space-a' } }),
    ).toBe(0);
    expect(
      await rescopeFrames({ db, resolver, scopes: { from: 'space-c', to: 'space-b' } }),
    ).toBe(0);
  });
});
