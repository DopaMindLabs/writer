import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
import { writerClock } from '@/lib/writerSyncIntegration/writerLogicalClock';
import { makePutFrame, makeDeleteFrame } from './writerOperationFactory';
import { applyInboundFrame } from './writerOperationMaterialiser';
import { createWriterFrameVerifier } from './writerFrameVerifier';
import { rescopeFrames } from './rescopeFrames';

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
