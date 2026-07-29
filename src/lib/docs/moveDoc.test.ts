import { db } from '@/db/db';
import { EMPTY_LEXICAL_JSON } from './emptyBody';
import { moveDoc } from './docRepository';

const putDoc = (id: string, sectionId: string, order?: number) =>
  db.docs.put({
    id,
    spaceId: 's1',
    sectionId,
    name: id,
    body: EMPTY_LEXICAL_JSON,
    meta: { wordCount: 0 },
    order,
    updatedAt: 100,
  });

const orderOf = async (id: string) => (await db.docs.get(id))?.order;
const sectionOf = async (id: string) => (await db.docs.get(id))?.sectionId;

describe('moveDoc', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await putDoc('a', 'sec1', 0);
    await putDoc('b', 'sec1', 1);
    await putDoc('c', 'sec1', 2);
  });

  it('reorders within a section and renumbers densely', async () => {
    await moveDoc({ docId: 'c', toSectionId: 'sec1', toIndex: 0 });
    expect(await orderOf('c')).toBe(0);
    expect(await orderOf('a')).toBe(1);
    expect(await orderOf('b')).toBe(2);
  });

  it('clamps an out-of-range index to the end', async () => {
    await moveDoc({ docId: 'a', toSectionId: 'sec1', toIndex: 99 });
    expect(await orderOf('b')).toBe(0);
    expect(await orderOf('c')).toBe(1);
    expect(await orderOf('a')).toBe(2);
  });

  it('moves a document to another section, renumbering both', async () => {
    await putDoc('x', 'sec2', 0);
    await moveDoc({ docId: 'b', toSectionId: 'sec2', toIndex: 0 });

    expect(await sectionOf('b')).toBe('sec2');
    expect(await orderOf('b')).toBe(0);
    expect(await orderOf('x')).toBe(1);
    // Source section closes the gap.
    expect(await orderOf('a')).toBe(0);
    expect(await orderOf('c')).toBe(1);
  });

  it('is a no-op for an unknown document', async () => {
    await moveDoc({ docId: 'missing', toSectionId: 'sec1', toIndex: 0 });
    expect(await orderOf('a')).toBe(0);
    expect(await orderOf('b')).toBe(1);
    expect(await orderOf('c')).toBe(2);
  });

  it('rejects an empty docId or target section', async () => {
    await expect(
      moveDoc({ docId: '', toSectionId: 'sec1', toIndex: 0 }),
    ).rejects.toThrow();
    await expect(
      moveDoc({ docId: 'a', toSectionId: '', toIndex: 0 }),
    ).rejects.toThrow();
  });
});
