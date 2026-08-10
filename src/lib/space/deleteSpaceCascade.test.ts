import { db } from '@/db/db';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs/emptyBody';
import { docBodyBaselineKey } from '@/lib/docs';
import { collabSeedKey } from '@/lib/collab/seedKey';
import { deleteSpaceCascade } from './deleteSpaceCascade';
import { FIXED_TIME, sampleMetadata } from '@/test/fixtures';

const seedSpace = async (spaceId: string) => {
  await db.spaces.put({
    ...sampleMetadata(spaceId),
    id: spaceId,
    tag: 'tst',
    name: `Space ${spaceId}`,
    shared: false,
    template: 'test-tpl',
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
  });
  await db.docs.put({
    ...sampleMetadata(spaceId),
    id: `doc-${spaceId}`,
    spaceId,
    sectionId: `sec-${spaceId}`,
    name: 'Doc',
    body: EMPTY_LEXICAL_JSON,
    meta: { wordCount: 0 },
    updatedAt: FIXED_TIME,
  });
  await db.noteAttachments.put({
    ...sampleMetadata(spaceId),
    id: `att-${spaceId}`,
    noteId: `note-${spaceId}`,
    spaceId,
    name: 'a.png',
    mime: 'image/png',
    size: 1,
    blob: new Blob(['x']),
    createdAt: FIXED_TIME,
  });
  await db.writerNotebooks.put({
    ...sampleMetadata(spaceId),
    id: `notebook-${spaceId}`,
    spaceId,
    title: 'Field notebook',
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
  });
  await db.writerNotebookPages.put({
    ...sampleMetadata(spaceId),
    id: `page-${spaceId}`,
    notebookId: `notebook-${spaceId}`,
    spaceId,
    order: 0,
    sourceAssetId: `source-${spaceId}`,
    thumbnailAssetId: `thumbnail-${spaceId}`,
    width: 100,
    height: 200,
    rotation: 0,
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
  });
  await db.writerNotebookAssets.bulkPut([
    {
      ...sampleMetadata(spaceId),
      id: `source-${spaceId}`,
      notebookId: `notebook-${spaceId}`,
      pageId: `page-${spaceId}`,
      spaceId,
      kind: 'source',
      mime: 'image/webp',
      size: 1,
      blob: new Blob(['x'], { type: 'image/webp' }),
      createdAt: FIXED_TIME,
    },
    {
      ...sampleMetadata(spaceId),
      id: `thumbnail-${spaceId}`,
      notebookId: `notebook-${spaceId}`,
      pageId: `page-${spaceId}`,
      spaceId,
      kind: 'thumbnail',
      mime: 'image/webp',
      size: 1,
      blob: new Blob(['x'], { type: 'image/webp' }),
      createdAt: FIXED_TIME,
    },
  ]);
  await db.revisions.put({
    ...sampleMetadata(spaceId),
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
  await db.meta.put({
    key: docBodyBaselineKey(`doc-${spaceId}`),
    value: EMPTY_LEXICAL_JSON,
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

  it('purges the deleted space’s notebooks, pages and assets', async () => {
    await deleteSpaceCascade('s1');

    expect(await db.writerNotebooks.get('notebook-s1')).toBeUndefined();
    expect(await db.writerNotebookPages.get('page-s1')).toBeUndefined();
    expect(await db.writerNotebookAssets.get('source-s1')).toBeUndefined();
    expect(await db.writerNotebookAssets.get('thumbnail-s1')).toBeUndefined();
  });

  it('clears the deleted space’s CRDT log and seed markers', async () => {
    await deleteSpaceCascade('s1');

    expect(await db.docUpdates.where('docId').equals('doc-s1').count()).toBe(0);
    expect(await db.meta.get(collabSeedKey('doc-s1'))).toBeUndefined();
    expect(await db.meta.get(docBodyBaselineKey('doc-s1'))).toBeUndefined();
  });

  it('leaves other spaces’ rows untouched', async () => {
    await deleteSpaceCascade('s1');

    expect(await db.spaces.get('s2')).toBeDefined();
    expect(await db.docs.get('doc-s2')).toBeDefined();
    expect(await db.noteAttachments.get('att-s2')).toBeDefined();
    expect(await db.revisions.get('rev-s2')).toBeDefined();
    expect(await db.writerNotebooks.get('notebook-s2')).toBeDefined();
    expect(await db.writerNotebookPages.get('page-s2')).toBeDefined();
    expect(await db.writerNotebookAssets.get('source-s2')).toBeDefined();
    expect(await db.docUpdates.where('docId').equals('doc-s2').count()).toBe(1);
    expect(await db.meta.get(collabSeedKey('doc-s2'))).toBeDefined();
    expect(await db.meta.get(docBodyBaselineKey('doc-s2'))).toBeDefined();
  });
});
