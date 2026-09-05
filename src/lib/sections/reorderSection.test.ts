import { db } from '@/db/db';
import { InvariantError } from '@/lib/invariant';
import { sampleMetadata } from '@/test/fixtures';
import { reorderSection } from './reorderSection';

const putSection = (id: string, order: number, parentSectionId: string | null = null) =>
  db.sections.put({ ...sampleMetadata(), id, spaceId: 's1', parentSectionId, label: id, order });

const orderOf = async (id: string) => (await db.sections.get(id))?.order;

describe('reorderSection', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await putSection('a', 0);
    await putSection('b', 1);
    await putSection('c', 2);
  });

  it('moves a section to a new position and renumbers densely', async () => {
    await reorderSection('c', 0);
    expect(await orderOf('c')).toBe(0);
    expect(await orderOf('a')).toBe(1);
    expect(await orderOf('b')).toBe(2);
  });

  it('clamps an out-of-range index to the end', async () => {
    await reorderSection('a', 99);
    expect(await orderOf('b')).toBe(0);
    expect(await orderOf('c')).toBe(1);
    expect(await orderOf('a')).toBe(2);
  });

  it('ignores subsections (only top-level sections reorder)', async () => {
    await putSection('sub', 0, 'a');
    await reorderSection('sub', 2);
    // The top-level list is untouched.
    expect(await orderOf('a')).toBe(0);
    expect(await orderOf('b')).toBe(1);
    expect(await orderOf('c')).toBe(2);
  });

  it('gives every renumbered section its own fresh mutation id', async () => {
    const before = await db.sections.toArray();

    await reorderSection('c', 0);

    const after = await db.sections.toArray();
    const ids = after.map((section) => section.mutationId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of after) {
      const previous = before.find((candidate) => candidate.id === section.id);
      expect(section.mutationId).not.toBe(previous?.mutationId);
    }
  });

  it('is a no-op for an unknown section', async () => {
    await reorderSection('missing', 0);
    expect(await orderOf('a')).toBe(0);
  });

  it('rejects an empty section id', async () => {
    await expect(reorderSection('', 0)).rejects.toThrow(InvariantError);
  });
});
