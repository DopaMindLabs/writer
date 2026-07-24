import { vi, afterEach } from 'vitest';
import dexieCloud from 'dexie-cloud-addon';
import { db } from '@/db/db';
import { LoremDB } from '@/db/LoremDB';
import { collabSeedKey } from '@/lib/collab/seedKey';
import { docBodyBaselineKey } from '@/lib/docs';
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
  sampleRevision,
} from '@/test/fixtures';
import type { Section } from '@/db/schema';
import { deleteSectionCascade } from './deleteSectionCascade';

type Row = Record<string, unknown>;
const UNSYNCED = [
  'settings', 'backups', 'syncs', 'syncConfigs',
  'docInspectorConfigs', 'meta', 'docUpdates',
];

const seedDocGraph = async (docId: string, sectionId: string): Promise<void> => {
  await db.docs.put({ ...sampleDoc, id: docId, sectionId });
  await db.annotations.put({ ...sampleAnnotation, id: `ann-${docId}`, docId });
  await db.revisions.put({ ...sampleRevision, id: `rev-${docId}`, docId });
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

const putSection = (over: Partial<Section> & Pick<Section, 'id' | 'label'>) =>
  db.sections.put({
    spaceId: 's1',
    parentSectionId: null,
    order: 0,
    ...over,
  });

describe('deleteSectionCascade', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    // Target section with a subsection; each holds one document.
    await putSection({ id: 'sec1', label: 'Drafts', order: 0 });
    await putSection({ id: 'sec1a', label: 'Ideas', parentSectionId: 'sec1', order: 0 });
    await seedDocGraph('d1', 'sec1');
    await seedDocGraph('d-sub', 'sec1a');
    // A sibling section that must be left untouched.
    await putSection({ id: 'sec2', label: 'Final', order: 1 });
    await seedDocGraph('d2', 'sec2');
    // The reserved Workshop section.
    await putSection({ id: 'sec-ws', label: 'Workshop', order: 2 });
  });

  it('removes the section, its subsections, and all their documents', async () => {
    await deleteSectionCascade('sec1');

    expect(await db.sections.get('sec1')).toBeUndefined();
    expect(await db.sections.get('sec1a')).toBeUndefined();
    expect(await db.docs.get('d1')).toBeUndefined();
    expect(await db.docs.get('d-sub')).toBeUndefined();
  });

  it('cascades each document’s annotations, revisions, and CRDT state', async () => {
    await deleteSectionCascade('sec1');

    for (const docId of ['d1', 'd-sub']) {
      expect(await db.annotations.where('docId').equals(docId).count()).toBe(0);
      expect(await db.revisions.where('docId').equals(docId).count()).toBe(0);
      expect(await db.docUpdates.where('docId').equals(docId).count()).toBe(0);
      expect(await db.meta.get(collabSeedKey(docId))).toBeUndefined();
      expect(await db.meta.get(docBodyBaselineKey(docId))).toBeUndefined();
    }
  });

  it('leaves sibling sections and their documents untouched', async () => {
    await deleteSectionCascade('sec1');

    expect(await db.sections.get('sec2')).toBeDefined();
    expect(await db.docs.get('d2')).toBeDefined();
    expect(await db.annotations.where('docId').equals('d2').count()).toBe(1);
    expect(await db.docUpdates.where('docId').equals('d2').count()).toBe(1);
  });

  it('refuses to delete the Workshop section', async () => {
    await expect(deleteSectionCascade('sec-ws')).rejects.toThrow(/Workshop/);
    expect(await db.sections.get('sec-ws')).toBeDefined();
  });

  it('is a no-op for an unknown section id', async () => {
    await deleteSectionCascade('does-not-exist');
    expect(await db.docs.count()).toBe(3);
  });

  it('rejects an empty section id', async () => {
    await expect(deleteSectionCascade('')).rejects.toThrow();
  });
});

describe('deleteSectionCascade under cloud encryption', () => {
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
    cloudDb = new LoremDB('delete-section-cloud', { addons: [dexieCloud], cloud: true });
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

  it('deletes the section and its documents even though rows are encrypted', async () => {
    await cloudDb.table<Row>('sections').put({
      id: 'cs', spaceId: 's', parentSectionId: null, label: 'Cloud', order: 0,
    });
    await cloudDb.table<Row>('docs').put({
      id: 'cd', spaceId: 's', sectionId: 'cs', updatedAt: 1, name: 'D',
    });

    await deleteSectionCascade('cs', cloudDb);

    expect(await cloudDb.table<Row>('sections').get('cs')).toBeUndefined();
    expect(await cloudDb.table<Row>('docs').get('cd')).toBeUndefined();
  });
});
