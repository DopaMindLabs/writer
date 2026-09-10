import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import {
  NoteKind,
  NoteState,
  type Note,
  type NoteAttachment,
} from '@/db/schema';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import {
  MAX_OBSERVED_DRIFT_MILLIS,
  RemoteClockDriftError,
  asDeviceId,
  asOperationId,
  asPrincipalId,
  compareTimestamps,
} from 'writer-sync/core';
import { newEntityMetadata } from '@/lib/writerSyncIntegration/writerEntityMetadata';
import {
  fromBase64,
  toBase64,
  type SyncKeyRing,
} from 'writer-sync/crypto';
import type { EncryptedSyncFrame } from 'writer-sync/operations';
import {
  ChunkIntegrityError,
  FramePayloadMismatchError,
  TRANSFER_CHUNK_BYTES,
} from 'writer-sync/operations';
import { prepareFramePayload } from './attachmentFramePayload';
import {
  DisallowedOperationTableError,
  UntrustedFrameError,
} from './frameAdmission';
import { createWriterFrameVerifier } from './writerFrameVerifier';
import {
  journalledDelete,
  journalledPut,
  makeDeleteFrame,
  makePutFrame,
} from './writerOperationFactory';
import {
  AttachmentChunksPendingError,
  applyInboundFrame,
} from './writerOperationMaterializer';

/**
 * The slice 1E acceptance gate: two in-memory Writer databases exchange plain
 * operation arrays — no network code — and converge every table, converge
 * deletes, and apply every operation at most once.
 */

const DEVICE_A = asDeviceId('device-a');
const DEVICE_B = asDeviceId('device-b');

/**
 * Attribution is not what these cases are about — convergence is — so the
 * author check is satisfied outright here. What this device will actually
 * accept as an author is `writerFrameVerifier.test.ts`, and what happens to a
 * frame it will not is the refusal case at the end of this suite.
 */
const acceptAnyAuthor = (): Promise<boolean> => Promise.resolve(true);

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

const attachmentBytes = (): Uint8Array =>
  Uint8Array.from(
    { length: TRANSFER_CHUNK_BYTES + 17 },
    (_unused, index) => index % 251,
  );

const attachment = (): NoteAttachment => {
  const bytes = attachmentBytes();
  const content = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return {
    accessScopeId: 's1',
    createdBy: asPrincipalId('me'),
    updatedBy: asPrincipalId('me'),
    mutationId: asOperationId('op-a1'),
    logicalUpdatedAt: { millis: 1000, counter: 0 },
    id: 'a1',
    noteId: 'n1',
    spaceId: 's1',
    name: 'figure.png',
    mime: 'image/png',
    size: bytes.length,
    blob: new Blob([content], { type: 'image/png' }),
    createdAt: 1000,
  };
};

const chunkedAttachmentFrame = async () => {
  const prepared = await prepareFramePayload({
    entityTable: 'noteAttachments',
    row: { ...attachment() },
    ring,
  });
  const frame = await makePutFrame({
    ring,
    deviceId: DEVICE_A,
    entityTable: 'noteAttachments',
    row: prepared.row,
  });
  return { frame, chunks: prepared.chunks };
};

/** Ship every journalled frame from one database into the other. */
const shipAll = async (from: LoremDB, to: LoremDB): Promise<void> => {
  const frames = await from.syncOperations.toArray();
  for (const frame of frames) {
    await applyInboundFrame({ db: to, frame: JSON.parse(JSON.stringify(frame)), ring, verifySignature: acceptAnyAuthor });
  }
};

beforeEach(async () => {
  ring = await deriveKeyRing(generateRootSecret(), 1);
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

  it('records the origin and logical time in the inbox, outliving the frame', async () => {
    // The inbox is what the catch-up manifest is built from once compaction has
    // dropped the frame, so the entry must carry the frame's ordering fields.
    await journalledPut({
      db: dbA,
      ring,
      deviceId: DEVICE_A,
      entityTable: 'notes',
      row: note(),
    });
    await shipAll(dbA, dbB);

    const frame = await dbA.syncOperations.toCollection().first();
    expect(frame).toBeDefined();
    const entry = await dbB.syncInbox.get(String(frame?.operationId));
    expect(entry?.deviceId).toBe(frame?.deviceId);
    expect(entry?.logicalAt).toEqual(frame?.logicalAt);
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
    await applyInboundFrame({ db: dbB, frame: JSON.parse(JSON.stringify(stale)), ring, verifySignature: acceptAnyAuthor });

    expect(await dbB.notes.get('n1')).toBeUndefined();
    const tombstone = await dbB.syncTombstones.get(['notes', 'n1']);
    expect(tombstone).toBeDefined();
  });

  it('refuses a peer put older than a deletion this device made itself', async () => {
    // `journalledDelete` stands in for the middleware: a local deletion writes
    // its frame and its tombstone together. Without the tombstone the put would
    // be judged against the journal alone, where a delete never beats a put —
    // and the row this device deleted would come back while the peer that sent
    // the put converged on the deletion.
    await journalledPut({ db: dbB, ring, deviceId: DEVICE_B, entityTable: 'notes', row: note() });
    await journalledDelete({
      db: dbB,
      ring,
      deviceId: DEVICE_B,
      entityTable: 'notes',
      entityId: 'n1',
      accessScopeId: 's1',
    });

    const stale = await makePutFrame({
      ring,
      deviceId: DEVICE_A,
      entityTable: 'notes',
      row: note({
        mutationId: asOperationId('op-stale-peer'),
        logicalUpdatedAt: { millis: 500, counter: 0 },
        body: 'resurrected',
      }),
    });
    const result = await applyInboundFrame({
      db: dbB,
      frame: JSON.parse(JSON.stringify(stale)),
      ring,
      verifySignature: acceptAnyAuthor,
    });

    expect(result).toBe('tombstoned');
    expect(await dbB.notes.get('n1')).toBeUndefined();
  });

  it('keeps newer content when a stale delete arrives out of order', async () => {
    const base = note();
    await journalledPut({ db: dbA, ring, deviceId: DEVICE_A, entityTable: 'notes', row: base });
    await shipAll(dbA, dbB);

    // B holds a newer put; a delete stamped *before* it then arrives late
    // through another provider. Delivery order must not decide the outcome.
    const newer = note({
      body: 'newer',
      mutationId: asOperationId('op-n1-3'),
      logicalUpdatedAt: { millis: 3000, counter: 0 },
    });
    await journalledPut({ db: dbB, ring, deviceId: DEVICE_B, entityTable: 'notes', row: newer });
    const staleDelete = {
      ...makeDeleteFrame({
        ring,
        deviceId: DEVICE_A,
        entityTable: 'notes',
        entityId: 'n1',
        accessScopeId: 's1',
      }),
      logicalAt: { millis: 2000, counter: 0 },
    };

    const result = await applyInboundFrame({
      db: dbB,
      frame: JSON.parse(JSON.stringify(staleDelete)),
      ring, verifySignature: acceptAnyAuthor,
    });

    expect(result).toBe('superseded');
    expect((await dbB.notes.get('n1'))?.body).toBe('newer');
  });

  it('keeps the later of two deletes as the tombstone', async () => {
    await journalledPut({ db: dbA, ring, deviceId: DEVICE_A, entityTable: 'notes', row: note() });
    await shipAll(dbA, dbB);

    const deletion = makeDeleteFrame({
      ring,
      deviceId: DEVICE_A,
      entityTable: 'notes',
      entityId: 'n1',
      accessScopeId: 's1',
    });
    const later = { ...deletion, logicalAt: { millis: 4000, counter: 0 } };
    const earlier = {
      ...deletion,
      operationId: asOperationId('op-del-earlier'),
      deviceId: DEVICE_B,
      logicalAt: { millis: 3000, counter: 0 },
    };
    await applyInboundFrame({ db: dbB, frame: JSON.parse(JSON.stringify(later)), ring, verifySignature: acceptAnyAuthor });
    await applyInboundFrame({ db: dbB, frame: JSON.parse(JSON.stringify(earlier)), ring, verifySignature: acceptAnyAuthor });

    const tombstone = await dbB.syncTombstones.get(['notes', 'n1']);
    expect(tombstone?.logicalAt).toEqual({ millis: 4000, counter: 0 });
    expect(await dbB.notes.get('n1')).toBeUndefined();
  });

  it('stamps later than an accepted frame from a device running ahead', async () => {
    const ahead = { millis: Date.now() + 60_000, counter: 4 };
    const frame = await makePutFrame({
      ring,
      deviceId: DEVICE_A,
      entityTable: 'notes',
      row: note({ mutationId: asOperationId('op-ahead'), logicalUpdatedAt: ahead }),
    });

    await applyInboundFrame({ db: dbB, frame: JSON.parse(JSON.stringify(frame)), ring, verifySignature: acceptAnyAuthor });
    const local = newEntityMetadata('s1', asPrincipalId('me'));

    expect(compareTimestamps(local.logicalUpdatedAt, ahead)).toBeGreaterThan(0);
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
      applyInboundFrame({ db: dbB, frame: tampered, ring, verifySignature: acceptAnyAuthor }),
    ).rejects.toBeInstanceOf(FramePayloadMismatchError);
    expect(await dbB.notes.get('n1')).toBeUndefined();
  });

  it('assembles a thin attachment frame into the required Blob row', async () => {
    const { frame, chunks } = await chunkedAttachmentFrame();
    await dbB.syncAttachmentChunks.bulkPut(chunks);

    expect(await applyInboundFrame({ db: dbB, frame, ring, verifySignature: acceptAnyAuthor })).toBe('applied');

    const landed = await dbB.noteAttachments.get('a1');
    expect(landed).toBeDefined();
    if (!landed) throw new Error('attachment did not materialise');
    expect(landed.blob).toBeInstanceOf(Blob);
    expect(landed.blob.type).toBe('image/png');
    expect(new Uint8Array(await landed.blob.arrayBuffer())).toEqual(attachmentBytes());
    expect(landed).not.toHaveProperty('blobRef');
  });

  it('journals an incomplete attachment without stamping the inbox, then retries', async () => {
    const { frame, chunks } = await chunkedAttachmentFrame();

    await expect(
      applyInboundFrame({ db: dbB, frame, ring, verifySignature: acceptAnyAuthor }),
    ).rejects.toBeInstanceOf(AttachmentChunksPendingError);
    expect(await dbB.syncOperations.get(String(frame.operationId))).toEqual(frame);
    expect(await dbB.syncInbox.count()).toBe(0);
    expect(await dbB.noteAttachments.get('a1')).toBeUndefined();

    await dbB.syncAttachmentChunks.bulkPut(chunks);
    expect(await applyInboundFrame({ db: dbB, frame, ring, verifySignature: acceptAnyAuthor })).toBe('applied');
    expect(await dbB.syncInbox.count()).toBe(1);
    expect(await dbB.noteAttachments.get('a1')).toBeDefined();
  });

  it('refuses a tampered attachment chunk without materialising or stamping it', async () => {
    const { frame, chunks } = await chunkedAttachmentFrame();
    const [first, ...rest] = chunks;
    const bytes = fromBase64(first.bytes);
    bytes[0] ^= 1;
    await dbB.syncAttachmentChunks.bulkPut([
      { ...first, bytes: toBase64(bytes) },
      ...rest,
    ]);

    await expect(
      applyInboundFrame({ db: dbB, frame, ring, verifySignature: acceptAnyAuthor }),
    ).rejects.toBeInstanceOf(ChunkIntegrityError);
    expect(await dbB.noteAttachments.get('a1')).toBeUndefined();
    expect(await dbB.syncInbox.count()).toBe(0);
  });

  it('refuses a future-dated frame before it can win a conflict', async () => {
    const wall = Date.now();
    const ahead = { millis: wall + MAX_OBSERVED_DRIFT_MILLIS + 1, counter: 0 };
    const frame = await makePutFrame({
      ring,
      deviceId: DEVICE_A,
      entityTable: 'notes',
      row: note({ mutationId: asOperationId('op-ahead'), logicalUpdatedAt: ahead }),
    });

    await expect(
      applyInboundFrame({
        db: dbB,
        frame: JSON.parse(JSON.stringify(frame)),
        ring, verifySignature: acceptAnyAuthor,
        now: () => wall,
      }),
    ).rejects.toBeInstanceOf(RemoteClockDriftError);
    expect(await dbB.notes.get('n1')).toBeUndefined();
    expect(await dbB.syncOperations.count()).toBe(0);
    expect(await dbB.syncInbox.count()).toBe(0);
    expect(await dbB.syncTombstones.count()).toBe(0);
    // The refused reading did not join this device's clock either.
    const local = newEntityMetadata('s1', asPrincipalId('me'));
    expect(compareTimestamps(local.logicalUpdatedAt, ahead)).toBeLessThan(0);
  });

  it('accepts a frame exactly at the tolerated drift', async () => {
    const wall = Date.now();
    const edge = { millis: wall + MAX_OBSERVED_DRIFT_MILLIS, counter: 0 };
    const frame = await makePutFrame({
      ring,
      deviceId: DEVICE_A,
      entityTable: 'notes',
      row: note({ mutationId: asOperationId('op-edge'), logicalUpdatedAt: edge }),
    });

    const result = await applyInboundFrame({
      db: dbB,
      frame: JSON.parse(JSON.stringify(frame)),
      ring, verifySignature: acceptAnyAuthor,
      now: () => wall,
    });

    expect(result).toBe('applied');
    expect((await dbB.notes.get('n1'))?.body).toBe('hello');
  });

  it('refuses a future-dated delete before it can tombstone a row', async () => {
    await journalledPut({ db: dbB, ring, deviceId: DEVICE_B, entityTable: 'notes', row: note() });
    const wall = Date.now();
    const forged = {
      ...makeDeleteFrame({
        ring,
        deviceId: DEVICE_A,
        entityTable: 'notes',
        entityId: 'n1',
        accessScopeId: 's1',
      }),
      logicalAt: { millis: wall + MAX_OBSERVED_DRIFT_MILLIS + 1, counter: 0 },
    };

    await expect(
      applyInboundFrame({
        db: dbB,
        frame: JSON.parse(JSON.stringify(forged)),
        ring, verifySignature: acceptAnyAuthor,
        now: () => wall,
      }),
    ).rejects.toBeInstanceOf(RemoteClockDriftError);
    expect(await dbB.notes.get('n1')).toBeDefined();
    expect(await dbB.syncTombstones.count()).toBe(0);
    expect(await dbB.syncInbox.count()).toBe(0);
  });

  it('refuses a delete naming a table outside the journalled set', async () => {
    await dbB.settings.put({
      key: 'global',
      proseFont: 'Source Serif 4',
      uiFont: 'Geist',
      proseSize: 18,
      lineHeight: 1.6,
      measure: 68,
      theme: 'light',
    });
    const forged = makeDeleteFrame({
      ring,
      deviceId: DEVICE_A,
      entityTable: 'settings',
      entityId: 'global',
      accessScopeId: 's1',
    });

    await expect(
      applyInboundFrame({ db: dbB, frame: JSON.parse(JSON.stringify(forged)), ring, verifySignature: acceptAnyAuthor }),
    ).rejects.toBeInstanceOf(DisallowedOperationTableError);
    expect(await dbB.settings.get('global')).toBeDefined();
    expect(await dbB.syncOperations.count()).toBe(0);
    expect(await dbB.syncInbox.count()).toBe(0);
    expect(await dbB.syncTombstones.count()).toBe(0);
  });

  it('refuses a put naming a control table before opening its payload', async () => {
    // A frame sealed for `notes` and retargeted at the crypto escrow: the
    // payload's own binding names `notes`, so reaching decryption at all would
    // fail differently. The table check has to come first.
    const sealed = await makePutFrame({
      ring,
      deviceId: DEVICE_A,
      entityTable: 'notes',
      row: note(),
    });
    const forged = { ...sealed, entityTable: 'cloudCrypto' };

    await expect(
      applyInboundFrame({ db: dbB, frame: JSON.parse(JSON.stringify(forged)), ring, verifySignature: acceptAnyAuthor }),
    ).rejects.toBeInstanceOf(DisallowedOperationTableError);
    expect(await dbB.syncOperations.count()).toBe(0);
    expect(await dbB.syncInbox.count()).toBe(0);
  });

  it('refuses a frame no trusted identity signed, before touching any state', async () => {
    const frame = await makePutFrame({
      ring,
      deviceId: DEVICE_A,
      entityTable: 'notes',
      row: note(),
    });

    await expect(
      applyInboundFrame({
        db: dbB,
        frame: JSON.parse(JSON.stringify(frame)),
        ring,
        // The real rule: device-a has never paired with this database.
        verifySignature: createWriterFrameVerifier(dbB),
      }),
    ).rejects.toBeInstanceOf(UntrustedFrameError);
    expect(await dbB.notes.get('n1')).toBeUndefined();
    expect(await dbB.syncOperations.count()).toBe(0);
    expect(await dbB.syncInbox.count()).toBe(0);
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
