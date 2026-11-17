import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { InvariantError } from '@/lib/invariant';
import { sampleSpace, seedBasicSpace } from '@/test/fixtures';
import { renameSpace, retagSpace } from './spaceRepository';

describe('spaceRepository', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedBasicSpace();
  });

  it('renames a space and advances its convergence metadata', async () => {
    await renameSpace(sampleSpace.id, '  Renamed  ');

    const space = await db.spaces.get(sampleSpace.id);
    expect(space?.name).toBe('Renamed');
    expect(space?.mutationId).not.toBe(sampleSpace.mutationId);
  });

  it('re-tags a space and advances its convergence metadata', async () => {
    await retagSpace(sampleSpace.id, ' NEW ');

    const space = await db.spaces.get(sampleSpace.id);
    expect(space?.tag).toBe('NEW');
    expect(space?.mutationId).not.toBe(sampleSpace.mutationId);
  });

  it('leaves the space untouched for a blank name or tag', async () => {
    await renameSpace(sampleSpace.id, '   ');
    await retagSpace(sampleSpace.id, '');

    const space = await db.spaces.get(sampleSpace.id);
    expect(space?.name).toBe(sampleSpace.name);
    expect(space?.tag).toBe(sampleSpace.tag);
    expect(space?.mutationId).toBe(sampleSpace.mutationId);
  });

  it('throws on an empty space id', async () => {
    await expect(renameSpace('', 'Name')).rejects.toThrow(InvariantError);
    await expect(retagSpace('', 'TAG')).rejects.toThrow(InvariantError);
  });
});
