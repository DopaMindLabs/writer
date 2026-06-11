import { db } from '@/db/db';
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
    body: '',
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

  it('leaves other spaces’ rows untouched', async () => {
    await deleteSpaceCascade('s1');

    expect(await db.spaces.get('s2')).toBeDefined();
    expect(await db.docs.get('doc-s2')).toBeDefined();
    expect(await db.noteAttachments.get('att-s2')).toBeDefined();
    expect(await db.revisions.get('rev-s2')).toBeDefined();
  });
});
