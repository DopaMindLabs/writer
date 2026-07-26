import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { deriveKeyRing, generateMasterSecret } from '@/lib/cloud/crypto/keys';
import { asDeviceId, asOperationId, asPrincipalId } from 'writer-sync/core';
import type { SyncKeyRing } from 'writer-sync/crypto';
import type { EncryptedSyncFrame } from 'writer-sync/operations';
import { FramePayloadMismatchError } from 'writer-sync/operations';
import {
  journalledDelete,
  journalledPut,
  makePutFrame,
} from './writerOperationFactory';
import { applyInboundFrame } from './writerOperationMaterializer';

/**
 * The slice 1E acceptance gate: two in-memory Writer databases exchange plain
 * operation arrays — no network code — and converge every table, converge
 * deletes, and apply every operation at most once.
 */

const DEVICE_A = asDeviceId('device-a');
const DEVICE_B = asDeviceId('device-b');

let dbA: LoremDB;
let dbB: LoremDB;
let ring: SyncKeyRing;

const note = (overrides: Partial<Note> = {}): Note => ({
  accessScopeId: 's1',
  createdBy: asPrincipalId('me'),
  updatedBy: asPrincipalId('me'),
  mutationId: asOperationId(`op-${overrides.id ?? 'n1'}-1`),
  logicalUpdatedAt: { millis: 1000, counter: 0 },
  id: 'n1',
  spaceId: 's1',
  l: 24,
  t: 24,
  w: 184,
  h: 80,
  kind: NoteKind.Note,
  state: NoteState.User,
  body: 'hello',
  createdAt: 1000,
  ...overrides,
});

/** Ship every journalled frame from one database into the other. */
const shipAll = async (from: LoremDB, to: LoremDB): Promise<void> => {
  const frames = await from.syncOperations.toArray();
  for (const frame of frames) {
    await applyInboundFrame({ db: to, frame: JSON.parse(JSON.stringify(frame)), ring });
  }
};

beforeEach(async () => {
  ring = await deriveKeyRing(generateMasterSecret(), 1);
  dbA = new LoremDB('op-conv-a');
  dbB = new LoremDB('op-conv-b');
  await dbA.open();
  await dbB.open();
});

afterEach(async () => {
  await dbA.delete();
  await dbB.delete();
});

describe('two-database operation convergence (hermetic)', () => {
  it('converges a put across databases and applies it at most once', async () => {
    const row = note();
    await journalledPut({ db: dbA, ring, deviceId: DEVICE_A, entityTable: 'notes', row });

    await shipAll(dbA, dbB);
    // Duplicate delivery — a second provider handing over the same frames.
    await shipAll(dbA, dbB);

    const landed = await dbB.notes.get('n1');
    expect(landed?.body).toBe('hello');
    expect(landed?.createdBy).toBe('me');
    expect(await dbB.syncInbox.count()).toBe(1);
  });

  it('converges concurrent edits deterministically on both databases', async () => {
    const base = note();
    await journalledPut({ db: dbA, ring, deviceId: DEVICE_A, entityTable: 'notes', row: base });
    await shipAll(dbA, dbB);

    // Concurrent edits: same logical time, different devices — the tie breaks
    // by device id identically on both sides.
    const fromA = note({
      body: 'edit-from-a',
      mutationId: asOperationId('op-a-2'),
      logicalUpdatedAt: { millis: 2000, counter: 0 },
    });
    const fromB = note({
      body: 'edit-from-b',
      mutationId: asOperationId('op-b-2'),
      logicalUpdatedAt: { millis: 2000, counter: 0 },
    });
    await journalledPut({ db: dbA, ring, deviceId: DEVICE_A, entityTable: 'notes', row: fromA });
    await journalledPut({ db: dbB, ring, deviceId: DEVICE_B, entityTable: 'notes', row: fromB });

    await shipAll(dbA, dbB);
    await shipAll(dbB, dbA);

    const onA = await dbA.notes.get('n1');
    const onB = await dbB.notes.get('n1');
    // device-b sorts after device-a, so its edit wins everywhere.
    expect(onA?.body).toBe('edit-from-b');
    expect(onB?.body).toBe('edit-from-b');
  });

  it('propagates deletes and never resurrects from a stale put', async () => {
    const row = note();
    await journalledPut({ db: dbA, ring, deviceId: DEVICE_A, entityTable: 'notes', row });
    await shipAll(dbA, dbB);

    await journalledDelete({
      db: dbA,
      ring,
      deviceId: DEVICE_A,
      entityTable: 'notes',
      entityId: 'n1',
      accessScopeId: 's1',
    });
    await shipAll(dbA, dbB);
    expect(await dbB.notes.get('n1')).toBeUndefined();

    // A stale put (older logical time than the delete) arrives late through
    // another provider — it must not resurrect the note on either side.
    const stale = await makePutFrame({
      ring,
      deviceId: DEVICE_A,
      entityTable: 'notes',
      row: note({ mutationId: asOperationId('op-stale'), logicalUpdatedAt: { millis: 500, counter: 0 } }),
    });
    await applyInboundFrame({ db: dbB, frame: JSON.parse(JSON.stringify(stale)), ring });

    expect(await dbB.notes.get('n1')).toBeUndefined();
    const tombstone = await dbB.syncTombstones.get(['notes', 'n1']);
    expect(tombstone).toBeDefined();
  });

  it('applying an inbound frame does not mint a new local operation', async () => {
    await journalledPut({ db: dbA, ring, deviceId: DEVICE_A, entityTable: 'notes', row: note() });
    await shipAll(dbA, dbB);

    // B holds exactly the frame A shipped — nothing extra was journalled.
    const journalB = await dbB.syncOperations.toArray();
    expect(journalB).toHaveLength(1);
    expect(String(journalB[0].deviceId)).toBe(String(DEVICE_A));
  });

  it('rejects a frame whose ciphertext was tampered with', async () => {
    await journalledPut({ db: dbA, ring, deviceId: DEVICE_A, entityTable: 'notes', row: note() });
    const [frame] = await dbA.syncOperations.toArray();
    const tampered: EncryptedSyncFrame = { ...frame, payload: btoa('evil-bytes') };

    await expect(
      applyInboundFrame({ db: dbB, frame: tampered, ring }),
    ).rejects.toBeInstanceOf(FramePayloadMismatchError);
    expect(await dbB.notes.get('n1')).toBeUndefined();
  });

  it('converges every synced content table through the same protocol', async () => {
    const citation = {
      accessScopeId: 's1',
      createdBy: asPrincipalId('me'),
      updatedBy: asPrincipalId('me'),
      mutationId: asOperationId('op-cit'),
      logicalUpdatedAt: { millis: 1500, counter: 0 },
      id: 'cit1',
      spaceId: 's1',
      key: 'doe2020',
      authors: 'Doe, J.',
      title: 'On Bells',
      year: 2020,
      type: 'article' as const,
      useCount: 0,
    };
    await journalledPut({ db: dbA, ring, deviceId: DEVICE_A, entityTable: 'citations', row: citation });
    await shipAll(dbA, dbB);

    expect((await dbB.citations.get('cit1'))?.title).toBe('On Bells');
  });
});
