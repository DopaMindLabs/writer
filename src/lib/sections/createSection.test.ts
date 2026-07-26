import { db } from '@/db/db';
import { seedBasicSpace } from '@/test/fixtures';
import { InvariantError } from '@/lib/invariant';
import { createSection } from './createSection';

describe('createSection', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedBasicSpace();
  });

  it('adds a top-level section and returns its id', async () => {
    const id = await createSection('s1', 'Appendix', 3);
    const section = await db.sections.get(id);
    expect(section).toMatchObject({
      id,
      spaceId: 's1',
      parentSectionId: null,
      label: 'Appendix',
      order: 3,
    });
  });

  it('generates a distinct id per call', async () => {
    const first = await createSection('s1', 'One', 1);
    const second = await createSection('s1', 'Two', 2);
    expect(first).not.toBe(second);
  });

  it('rejects the reserved Workshop label', async () => {
    await expect(createSection('s1', 'Workshop', 3)).rejects.toThrow(
      InvariantError,
    );
    await expect(createSection('s1', '  Workshop  ', 3)).rejects.toThrow(
      InvariantError,
    );
  });
});
