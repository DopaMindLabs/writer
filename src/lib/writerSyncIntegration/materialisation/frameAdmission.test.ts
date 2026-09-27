import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import { journalledTables } from '@/lib/writerSyncIntegration/writerTablePolicy';
import { asDeviceId, asOperationId, asPrincipalId, MAX_OBSERVED_DRIFT_MILLIS } from 'writer-sync/core';
import type { EncryptedSyncFrame } from 'writer-sync/operations';
import {
  admittedFrame,
  DisallowedOperationTableError,
  readableFrames,
  requireJournalledTable,
} from './frameAdmission';
import { makePutFrame } from './writerOperationFactory';

let db: LoremDB;

beforeEach(async () => {
  db = new LoremDB('frame-admission');
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe('requireJournalledTable', () => {
  it('accepts every table the policy journals', () => {
    for (const table of journalledTables()) {
      expect(requireJournalledTable(db, table).name).toBe(table);
    }
  });

  it.each([
    ['cloudCrypto'],
    ['cloudDevices'],
    ['trustedDevices'],
    ['settings'],
    ['docUpdates'],
    ['syncInbox'],
    ['syncTombstones'],
  ])('refuses the control table %s', (table) => {
    expect(() => requireJournalledTable(db, table)).toThrow(
      DisallowedOperationTableError,
    );
  });

  it.each([['syncOperations'], ['syncAttachmentChunks']])(
    'refuses %s, replicated but not itself journalled',
    (table) => {
      expect(() => requireJournalledTable(db, table)).toThrow(
        DisallowedOperationTableError,
      );
    },
  );

  it('refuses a table this app does not know', () => {
    expect(() => requireJournalledTable(db, 'not-a-table')).toThrow(
      DisallowedOperationTableError,
    );
  });
});

describe('admittedFrame', () => {
  const note = (millis: number): Note => ({
    id: 'n1', accessScopeId: 's1', spaceId: 's1',
    createdBy: asPrincipalId('me'), updatedBy: asPrincipalId('me'),
    mutationId: asOperationId(`op-${String(millis)}`), logicalUpdatedAt: { millis, counter: 0 },
    l: 0, t: 0, w: 100, h: 100, kind: NoteKind.Note, state: NoteState.User,
    body: 'body', createdAt: millis,
  });
  const frame = async (millis = Date.now()): Promise<EncryptedSyncFrame> => ({
    ...(await makePutFrame({
      ring: await deriveKeyRing(generateRootSecret(), 1), deviceId: asDeviceId('author'),
      entityTable: 'notes', row: note(millis),
    })),
    signature: 'signed',
  });
  const trusting = (verdict: boolean) => () => Promise.resolve(verdict);

  it('admits a well-formed frame a trusted identity signed', async () => {
    const candidate = await frame();
    expect(await admittedFrame({ db, candidate, verifySignature: trusting(true) })).toEqual(candidate);
  });

  it('refuses a frame no trusted identity signed', async () => {
    expect(await admittedFrame({ db, candidate: await frame(), verifySignature: trusting(false) }))
      .toBeNull();
  });

  it.each([
    ['altered after hashing', async () => ({ ...(await frame()), payload: btoa('altered') })],
    ['naming a control table', async () => ({ ...(await frame()), entityTable: 'trustedDevices' })],
    ['stamped beyond the clock it will merge',
      () => frame(Date.now() + MAX_OBSERVED_DRIFT_MILLIS + 60_000)],
  ])('refuses a frame %s', async (_case, build) => {
    expect(await admittedFrame({ db, candidate: await build(), verifySignature: trusting(true) }))
      .toBeNull();
  });
});

describe('readableFrames', () => {
  const row: EncryptedSyncFrame = {
    v: 1, operationId: asOperationId('op-1'), accessScopeId: 's1', entityTable: 'notes',
    entityId: 'n1', kind: 'delete', deviceId: asDeviceId('author'),
    logicalAt: { millis: 1000, counter: 0 }, keyId: 'k1', epoch: 1,
    payloadHash: 'hash', payload: '', signature: 'signed',
  };

  it('keeps the rows that decode, as the frames they decode to, and leaves out the rest', () => {
    const extended = { ...row, operationId: 'op-2', note: 'not part of a frame' };

    expect(readableFrames([row, { ...row, logicalAt: undefined }, extended, null, 'frame']))
      .toEqual([row, { ...row, operationId: asOperationId('op-2') }]);
  });
});
