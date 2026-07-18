import { vi, afterEach } from 'vitest';
import dexieCloud from 'dexie-cloud-addon';
import { db } from '@/db/db';
import { LoremDB } from '@/db/LoremDB';
import { collabSeedKey } from '@/lib/collab/seedKey';
import { docBodyBaselineKey } from './docBodyBaseline';
import { createEncryptionMiddleware } from '@/lib/cloud/crypto/middleware';
import {
  deviceKeyProvider,
  saveDeviceKeyRing,
  forgetDeviceKeyRing,
} from '@/lib/cloud/crypto/keyStore';
import { deriveKeyRing, generateMasterSecret } from '@/lib/cloud/crypto/keys';
import {
  FIXED_TIME,
  sampleAnnotation,
  sampleDoc,
  sampleNote,
  sampleRevision,
} from '@/test/fixtures';
import { deleteDocCascade } from './deleteDocCascade';

type Row = Record<string, unknown>;
const UNSYNCED = [
  'settings', 'backups', 'syncs', 'syncConfigs',
  'docInspectorConfigs', 'meta', 'docUpdates',
];

const seedDocGraph = async (docId: string): Promise<void> => {
  await db.docs.put({ ...sampleDoc, id: docId });
  await db.annotations.put({ ...sampleAnnotation, id: `ann-${docId}`, docId });
  await db.revisions.put({ ...sampleRevision, id: `rev-${docId}`, docId });
  // A Brain Space note that links to this doc.
  await db.notes.put({
    ...sampleNote,
    id: `note-${docId}`,
    linkedDocId: docId,
  });
  await db.docUpdates.add({
    docId,
    engine: 'yjs',
    formatVersion: 1,
    payload: new Uint8Array([1, 2, 3]),
    createdAt: FIXED_TIME,
  });
  await db.meta.put({ key: collabSeedKey(docId), value: { seededAt: FIXED_TIME } });
  await db.meta.put({ key: docBodyBaselineKey(docId), value: sampleDoc.body });
};

describe('deleteDocCascade', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await seedDocGraph('d1');
    await seedDocGraph('d2');
  });

  it('removes the doc and everything keyed to it', async () => {
    await deleteDocCascade('d1');

    expect(await db.docs.get('d1')).toBeUndefined();
    expect(await db.annotations.where('docId').equals('d1').count()).toBe(0);
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(0);
  });

  it('clears the collaborative CRDT state for the deleted doc', async () => {
    await deleteDocCascade('d1');

    expect(await db.docUpdates.where('docId').equals('d1').count()).toBe(0);
    expect(await db.meta.get(collabSeedKey('d1'))).toBeUndefined();
    expect(await db.meta.get(docBodyBaselineKey('d1'))).toBeUndefined();
  });

  it('leaves other documents untouched', async () => {
    await deleteDocCascade('d1');

    expect(await db.docs.get('d2')).toBeDefined();
    expect(await db.annotations.where('docId').equals('d2').count()).toBe(1);
    expect(await db.revisions.where('docId').equals('d2').count()).toBe(1);
    expect(await db.docUpdates.where('docId').equals('d2').count()).toBe(1);
    expect(await db.meta.get(collabSeedKey('d2'))).toBeDefined();
    expect(await db.meta.get(docBodyBaselineKey('d2'))).toBeDefined();
  });

  it('unlinks Brain Space notes that pointed at the deleted doc, keeping the note', async () => {
    await deleteDocCascade('d1');

    // The note survives — only its dead link is cleared.
    const note = await db.notes.get('note-d1');
    expect(note).toBeDefined();
    expect(note?.linkedDocId).toBeUndefined();

    // A note linking to a different doc is untouched.
    expect((await db.notes.get('note-d2'))?.linkedDocId).toBe('d2');
  });

  it('rejects an empty docId', async () => {
    await expect(deleteDocCascade('')).rejects.toThrow();
  });
});

describe('deleteDocCascade under cloud encryption', () => {
  let cloudDb: LoremDB;

  beforeEach(async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    vi.stubGlobal('WebSocket', class {
      close() {}
      addEventListener() {}
      removeEventListener() {}
      send() {}
    });
    await forgetDeviceKeyRing();
    cloudDb = new LoremDB('delete-cascade-cloud', { addons: [dexieCloud], cloud: true });
    cloudDb.cloud.configure({
      databaseUrl: 'https://unset.example.invalid',
      requireAuth: false,
      disableWebSocket: true,
      disableEagerSync: true,
      unsyncedTables: UNSYNCED,
    });
    cloudDb.use(createEncryptionMiddleware(deviceKeyProvider));
    await cloudDb.open();
    await saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(generateMasterSecret(), 1) });
  });

  afterEach(async () => {
    await forgetDeviceKeyRing();
    await cloudDb.delete();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('unlinks notes even though linkedDocId is encrypted', async () => {
    await cloudDb.table<Row>('docs').put({
      id: 'cd', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'D',
    });
    await cloudDb.table<Row>('notes').put({
      id: 'cn', spaceId: 's', kind: 'text', createdAt: 1, linkedDocId: 'cd',
    });

    await deleteDocCascade('cd', cloudDb);

    const note = await cloudDb.table<Row>('notes').get('cn');
    expect(note).toBeDefined();
    expect(note?.linkedDocId).toBeUndefined();
  });
});
