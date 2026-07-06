import { db } from '@/db/db';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs/emptyBody';
import { collabSeedKey } from '@/lib/collab/seedKey';
import { deleteSpaceCascade } from './deleteSpaceCascade';
import { FIXED_TIME } from '@/test/fixtures';

const seedSpace = async (spaceId: string) => {
  await db.spaces.put({
    id: spaceId,
    tag: 'tst',
    name: `Space ${spaceId}`,
    shared: false,
    template: 'test-tpl',
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
  });
  await db.docs.put({
    id: `doc-${spaceId}`,
    spaceId,
    sectionId: `sec-${spaceId}`,
    name: 'Doc',
    body: EMPTY_LEXICAL_JSON,
    meta: { wordCount: 0 },
    updatedAt: FIXED_TIME,
  });
  await db.noteAttachments.put({
    id: `att-${spaceId}`,
    noteId: `note-${spaceId}`,
    spaceId,
    name: 'a.png',
    mime: 'image/png',
    size: 1,
    blob: new Blob(['x']),
    createdAt: FIXED_TIME,
  });
  await db.revisions.put({
    id: `rev-${spaceId}`,
    docId: `doc-${spaceId}`,
    body: '',
    text: '',
    wordCount: 0,
    kind: 'manual',
    createdAt: FIXED_TIME,
  });
  await db.docUpdates.add({
    docId: `doc-${spaceId}`,
    engine: 'yjs',
    formatVersion: 1,
    payload: new Uint8Array([1, 2, 3]),
    createdAt: FIXED_TIME,
  });
  await db.meta.put({
    key: collabSeedKey(`doc-${spaceId}`),
    value: { seededAt: FIXED_TIME },
  });
  await db.shares.put({
    docId: `doc-${spaceId}`,
    roomId: `room-${spaceId}`,
    relayUrl: 'wss://relay.example',
    role: 'owner',
    contentEpoch: 1,
    seededBy: 'author-1',
    seededAt: FIXED_TIME,
    rosterVersion: 1,
    createdAt: FIXED_TIME,
  });
};

describe('deleteSpaceCascade', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    await seedSpace('s1');
    await seedSpace('s2');
  });

  it('removes the space with its docs', async () => {
    await deleteSpaceCascade('s1');

    expect(await db.spaces.get('s1')).toBeUndefined();
    expect(await db.docs.get('doc-s1')).toBeUndefined();
  });

  it('purges the deleted space’s note attachments and doc revisions', async () => {
    await deleteSpaceCascade('s1');

    expect(await db.noteAttachments.get('att-s1')).toBeUndefined();
    expect(await db.revisions.get('rev-s1')).toBeUndefined();
  });

  it('clears the deleted space’s CRDT log and seed markers', async () => {
    await deleteSpaceCascade('s1');

    expect(await db.docUpdates.where('docId').equals('doc-s1').count()).toBe(0);
    expect(await db.meta.get(collabSeedKey('doc-s1'))).toBeUndefined();
    expect(await db.shares.get('doc-s1')).toBeUndefined();
  });

  it('leaves other spaces’ rows untouched', async () => {
    await deleteSpaceCascade('s1');

    expect(await db.spaces.get('s2')).toBeDefined();
    expect(await db.docs.get('doc-s2')).toBeDefined();
    expect(await db.noteAttachments.get('att-s2')).toBeDefined();
    expect(await db.revisions.get('rev-s2')).toBeDefined();
    expect(await db.docUpdates.where('docId').equals('doc-s2').count()).toBe(1);
    expect(await db.meta.get(collabSeedKey('doc-s2'))).toBeDefined();
    expect(await db.shares.get('doc-s2')).toBeDefined();
  });
});
