import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { deriveKeyRing, generateMasterSecret } from '@/lib/cloud/crypto/keys';
import { createEncryptionMiddleware } from '@/lib/cloud/crypto/middleware';
import {
  asDeviceId,
  asOperationId,
  asPrincipalId,
  compareTimestamps,
} from 'writer-sync/core';
import type { ScopeKeyResolver, SyncKeyRing } from 'writer-sync/crypto';
import { generateDeviceIdentity } from 'writer-sync/crypto';
import { createOperationJournalMiddleware } from './materialization/operationJournalMiddleware';
import { updateReplicatedRow } from './replicatedRowUpdate';

vi.mock('@/lib/account/profile', () => ({
  getProfile: vi.fn().mockResolvedValue({
    authorId: 'editor-1',
    displayName: 'A. Writer',
    presenceHue: 'presence-1',
  }),
}));

let db: LoremDB;
const holder: { ring: SyncKeyRing | null } = { ring: null };

const resolver: ScopeKeyResolver = {
  keyFor: () => holder.ring,
  hasAnyKey: () => holder.ring !== null,
};

const note = (): Note => ({
  accessScopeId: 's1',
  createdBy: asPrincipalId('author-1'),
  updatedBy: asPrincipalId('author-1'),
  mutationId: asOperationId('op-n1-1'),
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
});

beforeEach(async () => {
  holder.ring = await deriveKeyRing(generateMasterSecret(), 1);
  db = new LoremDB('replicated-row-update');
  db.use(createEncryptionMiddleware(resolver, () => 'none'));
  db.use(
    createOperationJournalMiddleware({
      resolver,
      identity: async () => ({
        deviceId: asDeviceId('device-local'),
        privateKey: (await generateDeviceIdentity()).privateKey,
      }),
    }),
  );
  await db.open();
  await db.notes.put(note());
});

afterEach(async () => {
  await db.delete();
});

describe('updateReplicatedRow', () => {
  it('applies the change and advances the row’s convergence metadata', async () => {
    await updateReplicatedRow(db.notes, 'n1', { body: 'edited' });

    const stored = await db.notes.get('n1');
    expect(stored?.body).toBe('edited');
    expect(stored?.mutationId).not.toBe('op-n1-1');
    expect(
      compareTimestamps(stored?.logicalUpdatedAt ?? { millis: 0, counter: 0 }, {
        millis: 1000,
        counter: 0,
      }),
    ).toBeGreaterThan(0);
  });

  it('records the editing principal without rewriting the author', async () => {
    await updateReplicatedRow(db.notes, 'n1', { body: 'edited' });

    const stored = await db.notes.get('n1');
    expect(stored?.updatedBy).toBe('editor-1');
    expect(stored?.createdBy).toBe('author-1');
  });

  it('mints a distinct operation id for each successive update', async () => {
    await updateReplicatedRow(db.notes, 'n1', { body: 'first' });
    const first = await db.notes.get('n1');
    await updateReplicatedRow(db.notes, 'n1', { body: 'second' });
    const second = await db.notes.get('n1');

    expect(second?.mutationId).not.toBe(first?.mutationId);
  });

  it('journals an operation the other devices have not already accepted', async () => {
    await updateReplicatedRow(db.notes, 'n1', { body: 'edited' });

    // Reusing the create's operation id would make every receiver skip the
    // update as a replay, so the edit would never leave this device.
    const ids = (await db.syncOperations.toArray()).map((frame) => frame.operationId);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('reports no rows updated for an unknown id', async () => {
    await expect(updateReplicatedRow(db.notes, 'missing', { body: 'x' })).resolves.toBe(0);
  });
});
