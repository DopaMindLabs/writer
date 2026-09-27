import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import {
  asDeviceId, asOperationId, asPrincipalId, TrustedDeviceStatus,
} from 'writer-sync/core';
import {
  generateDeviceIdentity, publicJwkOf, signFrame,
  type DeviceIdentityKeys, type ScopeKeyResolver, type SyncKeyRing,
} from 'writer-sync/crypto';
import { compactableOperationIds, type EncryptedSyncFrame } from 'writer-sync/operations';
import { createTrustedDeviceStore } from '@/lib/writerSyncIntegration/trustedDeviceStore';
import { removeTrustedDevice } from '@/lib/writerSyncIntegration/removeTrustedDevice';
import { writerClock } from '@/lib/writerSyncIntegration/writerLogicalClock';
import { compactJournal } from './compactJournal';
import { makePutFrame, makeDeleteFrame } from './writerOperationFactory';
import { applyInboundFrame } from './writerOperationMaterialiser';
import { createWriterFrameVerifier } from './writerFrameVerifier';
import { rescopeFrames } from './rescopeFrames';
import { tombstoneOf } from './tombstone';
import { createWriterFullState } from './writerFullState';

vi.mock('@/lib/profile/profile', () => ({
  getProfile: vi.fn().mockResolvedValue({
    authorId: 'author-1', displayName: 'A. Writer', presenceHue: 'presence-1',
  }),
}));

const FIRST = asDeviceId('review-first');
const SECOND = asDeviceId('review-second');
let firstKeys: DeviceIdentityKeys;
let secondKeys: DeviceIdentityKeys;
let rings: Map<string, SyncKeyRing>;
let db: LoremDB;
let peer: LoremDB;
const resolver: ScopeKeyResolver = {
  keyFor: ({ accessScopeId }) => rings.get(accessScopeId) ?? null,
  hasAnyKey: () => true,
};
const identity = () => Promise.resolve({ deviceId: SECOND, privateKey: secondKeys.privateKey });

const note = (overrides: Partial<Note> = {}): Note => ({
  id: 'n1', accessScopeId: 'scope-a', spaceId: 'scope-a',
  createdBy: asPrincipalId('me'), updatedBy: asPrincipalId('me'),
  mutationId: asOperationId('review-initial'), logicalUpdatedAt: writerClock.now(),
  l: 24, t: 24, w: 184, h: 80, kind: NoteKind.Note, state: NoteState.User,
  body: 'old content', createdAt: Date.now(), ...overrides,
});

const enqueue = async (row: Note, author: 'first' | 'second' = 'first') => {
  const frame = await makePutFrame({
    ring: rings.get(row.accessScopeId)!, entityTable: 'notes', row,
    deviceId: author === 'first' ? FIRST : SECOND,
  });
  const signed = {
    ...frame,
    signature: await signFrame(author === 'first' ? firstKeys.privateKey : secondKeys.privateKey, frame),
  };
  await db.syncOperations.put(signed);
  return signed;
};

const apply = (target: LoremDB, frame: EncryptedSyncFrame) => applyInboundFrame({
  db: target, frame, ring: rings.get(frame.accessScopeId)!,
  verifySignature: createWriterFrameVerifier(target),
});

beforeEach(async () => {
  db = new LoremDB('independent-rescope-sender');
  peer = new LoremDB('independent-rescope-peer');
  firstKeys = await generateDeviceIdentity();
  secondKeys = await generateDeviceIdentity();
  rings = new Map();
  for (const scope of ['scope-a', 'scope-b', 'scope-c']) {
    rings.set(scope, await deriveKeyRing(generateRootSecret(), 1));
  }
  for (const target of [db, peer]) {
    await target.open();
    for (const [deviceId, keys] of [[FIRST, firstKeys], [SECOND, secondKeys]] as const) {
      await createTrustedDeviceStore(target).trust({
        deviceId, publicIdentityJwk: await publicJwkOf(keys.publicKey),
        principalId: asPrincipalId('me'), status: TrustedDeviceStatus.Active,
        addedAt: Date.now(), lastSessionAt: Date.now(), displayName: 'Review fixture',
        acknowledgedOperations: {},
      });
    }
  }
});

afterEach(async () => {
  await db.delete();
  await peer.delete();
});

describe('scope moves after journal compaction', () => {
  it('does not promote an obsolete put over the current row after per-origin compaction', async () => {
    const old = await enqueue(note(), 'first');
    const current = await enqueue(note({
      body: 'current content', mutationId: asOperationId('review-current'),
    }), 'second');
    await apply(db, current);
    await apply(peer, current);
    const compactable = compactableOperationIds(await db.syncOperations.toArray(), {
      retention: { retentionDays: 30, now: Date.now() }, tombstones: [],
      peers: [{ deviceId: asDeviceId('review-third'), acknowledgedOperations: {
        'scope-a': { [SECOND]: current.operationId },
      } }],
    });
    expect(compactable).toEqual([current.operationId]);
    await db.syncOperations.bulkDelete(compactable.map(String));
    expect(await db.syncOperations.toArray()).toEqual([old]);
    await rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'scope-a', to: 'scope-b' } });
    for (const moved of await db.syncOperations.where({ accessScopeId: 'scope-b' }).toArray()) {
      await apply(peer, moved);
    }
    expect((await peer.notes.get('n1'))?.body).toBe('current content');
  });

  it('does not replay a completed source into a third scope after destination compaction', async () => {
    await apply(db, await enqueue(note()));
    await rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'scope-a', to: 'scope-b' } });
    for (const moved of await db.syncOperations.where({ accessScopeId: 'scope-b' }).toArray()) {
      await apply(db, moved);
      await apply(peer, moved);
    }
    const edited = await enqueue(note({
      accessScopeId: 'scope-b', mutationId: asOperationId('review-edited'), body: 'new destination content',
    }), 'second');
    await apply(db, edited);
    await apply(peer, edited);
    await db.syncOperations.where({ accessScopeId: 'scope-b' }).delete();
    await rescopeFrames({ requestId: 'stale-move-a-c', db, resolver, identity, scopes: { from: 'scope-a', to: 'scope-c' } });
    for (const moved of await db.syncOperations.where({ accessScopeId: 'scope-c' }).toArray()) {
      await apply(peer, moved);
    }
    expect((await peer.notes.get('n1'))?.body).toBe('new destination content');
    expect((await peer.notes.get('n1'))?.accessScopeId).toBe('scope-b');
  });

  it('does not turn an obsolete delete into a new deletion after a compacted resurrection', async () => {
    const unsigned = makeDeleteFrame({
      ring: rings.get('scope-a')!, deviceId: FIRST, entityTable: 'notes',
      entityId: 'n1', accessScopeId: 'scope-a',
    });
    const deleted = { ...unsigned, signature: await signFrame(firstKeys.privateKey, unsigned) };
    await apply(db, deleted);
    const restored = await enqueue(note({
      body: 'restored content', mutationId: asOperationId('review-restored'),
    }), 'second');
    await apply(db, restored);
    await apply(peer, restored);
    expect(await db.syncTombstones.count()).toBe(0);
    const compactable = compactableOperationIds(await db.syncOperations.toArray(), {
      retention: { retentionDays: 30, now: Date.now() }, tombstones: [],
      peers: [{ deviceId: asDeviceId('review-third'), acknowledgedOperations: {
        'scope-a': { [SECOND]: restored.operationId },
      } }],
    });
    expect(compactable).toEqual([restored.operationId]);
    await db.syncOperations.bulkDelete(compactable.map(String));
    await rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'scope-a', to: 'scope-b' } });
    for (const moved of await db.syncOperations.where({ accessScopeId: 'scope-b' }).toArray()) {
      await apply(peer, moved);
    }
    expect((await peer.notes.get('n1'))?.body).toBe('restored content');
  });
});

describe('scope moves after a deletion is released', () => {
  /** What the journal middleware commits for a local deletion: frame and tombstone, no inbox row. */
  const deleteLocally = async (entityId: string) => {
    const unsigned = makeDeleteFrame({
      ring: rings.get('scope-a')!, deviceId: SECOND, entityTable: 'notes',
      entityId, accessScopeId: 'scope-a',
    });
    const signed = { ...unsigned, signature: await signFrame(secondKeys.privateKey, unsigned) };
    await db.syncOperations.put(signed);
    await db.syncTombstones.put({ ...tombstoneOf(signed), acknowledgedBy: [String(SECOND)] });
    await db.notes.delete(entityId);
  };

  it('moves the scope once removing the last peer releases a local deletion', async () => {
    // Authored here, so journalled beside the row and never passed through the inbox.
    await enqueue(note(), 'second');
    await db.notes.put(note());
    await deleteLocally('n1');
    const kept = note({ id: 'n2', body: 'kept content', mutationId: asOperationId('review-kept') });
    const keptFrame = await enqueue(kept, 'second');
    await db.notes.put({ ...kept, mutationId: keptFrame.operationId });

    await removeTrustedDevice({ db, deviceId: FIRST });
    expect(await db.syncTombstones.count()).toBe(0);

    await expect(rescopeFrames({
      requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'scope-a', to: 'scope-b' },
    })).resolves.toBe(1);
    expect((await db.notes.get('n2'))?.accessScopeId).toBe('scope-b');
    expect(await db.notes.get('n1')).toBeUndefined();
  });

  it('never re-applies a put its released deletion had already settled', async () => {
    const obsolete = await enqueue(note(), 'second');
    await deleteLocally('n1');

    await removeTrustedDevice({ db, deviceId: FIRST });

    // The ingestion sweep hands every journal frame without an inbox row to
    // the materialiser; the deletion evidence is gone, so only the recorded
    // verdict stands between this put and a resurrected note.
    await expect(apply(db, obsolete)).resolves.toBe('tombstoned');
    expect(await db.notes.get('n1')).toBeUndefined();
  });
});

describe('a withdrawal outlasting the retention window', () => {
  const YEAR = 365 * 24 * 60 * 60 * 1000;
  const OFFLINE = asDeviceId('review-offline');

  /** A peer that reads only the source scope, and has acknowledged `seen` of it. */
  const trustOffline = (seen: Partial<Record<string, string>> = {}) =>
    createTrustedDeviceStore(db).trust({
      deviceId: OFFLINE, publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'aQ', y: 'ag' },
      principalId: asPrincipalId('author-1'), status: TrustedDeviceStatus.Active,
      addedAt: Date.now(), lastSessionAt: Date.now(), displayName: 'Offline peer',
      acknowledgedOperations: Object.fromEntries(Object.entries(seen).map(
        ([scope, operationId]) => [scope, { [SECOND]: asOperationId(String(operationId)) }],
      )),
    });

  /** Move a note the source-only peer holds, and return the withdrawal it needs. */
  const movedAway = async (): Promise<EncryptedSyncFrame> => {
    const original = await enqueue(note(), 'second');
    await apply(db, original);
    await apply(peer, original);
    await rescopeFrames({ requestId: 'move-a-b', db, resolver, identity, scopes: { from: 'scope-a', to: 'scope-b' } });
    const withdrawal = (await db.syncOperations.where({ accessScopeId: 'scope-a' }).toArray())
      .find(({ kind }) => kind === 'delete');
    expect(withdrawal).toMatchObject({ entityId: 'n1' });
    return withdrawal!;
  };

  it('keeps it for a source-only peer away past the window, and serves it in a rebuild', async () => {
    const withdrawal = await movedAway();
    await trustOffline();

    await compactJournal(db, () => Date.now() + YEAR);
    expect(await db.syncOperations.get(String(withdrawal.operationId))).toEqual(withdrawal);

    // Back after the window, the peer is rebuilt from current state.
    const rebuilt = await createWriterFullState({ db, resolver, identity })('scope-a');
    expect(rebuilt).toEqual([withdrawal]);
    for (const frame of rebuilt) await apply(peer, frame);
    expect(await peer.notes.get('n1')).toBeUndefined();
    expect(await peer.syncTombstones.get(['notes', 'n1'])).toMatchObject({ accessScopeId: 'scope-a' });
  });

  it('neither keeps nor serves a delete no trusted device signed', async () => {
    const withdrawal = await movedAway();
    await trustOffline();
    // A provider wrote a delete of the moved note into the source scope.
    const forged = makeDeleteFrame({
      ring: rings.get('scope-a')!, deviceId: SECOND, entityTable: 'notes',
      entityId: 'n1', accessScopeId: 'scope-a',
    });
    await db.syncOperations.put(forged);

    expect(await createWriterFullState({ db, resolver, identity })('scope-a')).toEqual([withdrawal]);
    await compactJournal(db, () => Date.now() + YEAR);
    expect(await db.syncOperations.get(String(forged.operationId))).toBeUndefined();
    expect(await db.syncOperations.get(String(withdrawal.operationId))).toEqual(withdrawal);
  });

  it('keeps and serves a withdrawal accepted before its author was revoked', async () => {
    const withdrawal = await movedAway();
    await trustOffline();
    await createTrustedDeviceStore(db).revoke({ deviceId: SECOND, at: Date.now() });

    await compactJournal(db, () => Date.now() + YEAR);
    expect(await db.syncOperations.get(String(withdrawal.operationId))).toEqual(withdrawal);
    expect(await createWriterFullState({ db, resolver, identity })('scope-a')).toEqual([withdrawal]);
  });

  it('lets it go once every peer holds it', async () => {
    const withdrawal = await movedAway();
    await trustOffline({ 'scope-a': String(withdrawal.operationId) });

    await compactJournal(db, () => Date.now() + YEAR);

    expect(await db.syncOperations.get(String(withdrawal.operationId))).toBeUndefined();
  });
});
