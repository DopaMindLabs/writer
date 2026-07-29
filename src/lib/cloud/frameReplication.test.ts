import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Dexie from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import { STORES } from '@/db/stores';
import { asDeviceId, asOperationId, asPrincipalId } from 'writer-sync/core';
import type { ScopeKeyResolver } from 'writer-sync/crypto';
import { generateDeviceIdentity } from 'writer-sync/crypto';
import { createOperationJournalMiddleware } from '@/lib/writerSyncIntegration/materialization/operationJournalMiddleware';
import {
  localOnlyTables,
  rowEnvelopeTables,
} from '@/lib/writerSyncIntegration/writerTablePolicy';
import { generateMasterSecret, deriveKeyRing, type CloudKeyRing } from './crypto/keys';
import { createEncryptionMiddleware } from './crypto/middleware';
import { CIPHER_FIELD } from './crypto/tableRules';

/**
 * The go/no-go gate for the frame cutover, restated against the table Dexie
 * Cloud now replicates. Post-cutover the materialised content tables are local
 * projections and `syncOperations` is what crosses the wire, so the mutation
 * queue that must never hold plaintext is `$syncOperations_mutations`.
 *
 * It also pins the two provider-independence invariants the runbook demands of
 * the adapter: content rows are never queued for replication, and Writer's
 * `createdBy`/`updatedBy` attribution is never mapped onto Dexie's `owner`.
 */

interface FakeLogin {
  userId: string;
  claims: Record<string, unknown>;
  lastLogin: Date;
  isLoggedIn: true;
}

type CloudDexie = Dexie & {
  cloud: {
    configure: (options: unknown) => void;
    currentUser: { next: (user: FakeLogin) => void };
  };
};

type AnyRow = Record<string, unknown>;

const UNSYNCED = [...localOnlyTables(), ...rowEnvelopeTables()];
const DEVICE = asDeviceId('device-local');
const AUTHOR = asPrincipalId('author-principal');

let db: CloudDexie;
let ring: CloudKeyRing | null = null;

const resolver: ScopeKeyResolver = {
  keyFor: () => ring,
  hasAnyKey: () => ring !== null,
};

const table = (name: string) => db.table<AnyRow>(name);

/** dexie-cloud only queues mutations for a logged-in user. */
const signIn = (): void =>
  db.cloud.currentUser.next({
    userId: 'frame-user',
    claims: { sub: 'frame-user' },
    lastLogin: new Date(0),
    isLoggedIn: true,
  });

const note = (): AnyRow => ({
  id: 'n1',
  spaceId: 's1',
  kind: 'text',
  createdAt: 1,
  accessScopeId: 's1',
  createdBy: AUTHOR,
  updatedBy: AUTHOR,
  mutationId: asOperationId('op-n1-1'),
  logicalUpdatedAt: { millis: 1000, counter: 0 },
  title: 'TOPSECRET',
  body: 'hidden-body',
});

beforeEach(async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
  db = new Dexie('frame-replication', { addons: [dexieCloud] }) as CloudDexie;
  db.version(1).stores(STORES);
  db.cloud.configure({
    databaseUrl: 'https://unset.example.invalid',
    requireAuth: false,
    disableWebSocket: true,
    disableEagerSync: true,
    unsyncedTables: UNSYNCED,
  });
  db.use(createEncryptionMiddleware(resolver));
  db.use(
    createOperationJournalMiddleware({
      resolver,
      identity: async () => ({
        deviceId: DEVICE,
        privateKey: (await generateDeviceIdentity()).privateKey,
      }),
    }),
  );
  await db.open();
  ring = await deriveKeyRing(generateMasterSecret(), 1);
});

afterEach(async () => {
  ring = null;
  await db.delete();
  vi.restoreAllMocks();
});

describe('encrypted frame replication through Dexie Cloud', () => {
  it('GO/NO-GO: the frame mutation queue holds only ciphertext', async () => {
    signIn();
    await table('notes').put(note());

    const mutations = await table('$syncOperations_mutations').toArray();
    expect(mutations.length).toBeGreaterThan(0);
    const serialised = JSON.stringify(mutations);
    expect(serialised).not.toContain('TOPSECRET');
    expect(serialised).not.toContain('hidden-body');
    // Attribution names a person: it is sealed inside the payload, never in a
    // routing header a provider can read.
    expect(serialised).not.toContain(AUTHOR);
    // What the queue does carry is the routing header plus opaque ciphertext.
    expect(serialised).toContain('op-n1-1');
    expect(serialised).toContain('"entityTable":"notes"');
  });

  it('never queues a materialised content row for replication', async () => {
    signIn();
    await table('notes').put(note());

    // The content table is unsynced, so the addon keeps no mutation queue for
    // it at all — and if it ever did, it would have to be empty.
    const queued = db.tables.some((store) => store.name === '$notes_mutations')
      ? await table('$notes_mutations').toArray()
      : [];
    expect(queued).toEqual([]);
    expect(UNSYNCED).toContain('notes');
    expect(UNSYNCED).not.toContain('syncOperations');
    // Chunk rows replicate like the journal: a cloud device needs them to
    // rebuild the blob a thin frame names.
    expect(UNSYNCED).not.toContain('syncAttachmentChunks');
  });

  it('never maps createdBy or updatedBy onto the Dexie owner property', async () => {
    signIn();
    await table('notes').put(note());

    const frames = await db.table<AnyRow>('syncOperations').toArray();
    expect(frames).toHaveLength(1);
    // `owner` belongs to the adapter: Dexie stamps the signed-in account onto
    // rows it replicates, and that is the provider's business. What must never
    // happen is Writer's attribution being fed into it — a mapping would turn
    // the author's identity into an access-control fact on someone else's
    // server, and would break every provider that has no such property.
    expect(frames[0].owner).toBe('frame-user');
    expect(frames[0].owner).not.toBe(AUTHOR);
    // The frame itself carries no attribution at all: `createdBy`/`updatedBy`
    // live only inside the sealed payload.
    expect(frames[0].createdBy).toBeUndefined();
    expect(frames[0].updatedBy).toBeUndefined();
  });

  it('keeps the materialised row encrypted locally while the frame replicates', async () => {
    signIn();
    await table('notes').put(note());

    const raw = await db.transaction('r', db.table('notes'), async () => {
      const tx = Dexie.currentTransaction as unknown as {
        idbtrans?: { disableBlobResolve?: boolean };
      };
      if (tx.idbtrans) tx.idbtrans.disableBlobResolve = true;
      return db.table<AnyRow>('notes').get('n1');
    });
    expect(raw?.[CIPHER_FIELD]).toBeDefined();
    expect(raw?.title).toBeUndefined();
  });
});
