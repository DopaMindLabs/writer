import { db } from '@/db/db';
import { sampleDoc, seedBasicSpace } from '@/test/fixtures';
import { InvariantError } from '@/lib/invariant';
import { renameDoc } from './doc-actions';

describe('renameDoc', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedBasicSpace();
  });

  it('updates the doc name and timestamp', async () => {
    await renameDoc(sampleDoc.id, 'Renamed doc');
    const doc = await db.docs.get(sampleDoc.id);
    expect(doc?.name).toBe('Renamed doc');
    expect(doc?.updatedAt).toBeGreaterThan(sampleDoc.updatedAt);
  });

  it('trims surrounding whitespace', async () => {
    await renameDoc(sampleDoc.id, '  Trimmed  ');
    const doc = await db.docs.get(sampleDoc.id);
    expect(doc?.name).toBe('Trimmed');
  });

  it('is a no-op for an empty or whitespace-only name', async () => {
    await renameDoc(sampleDoc.id, '   ');
    const doc = await db.docs.get(sampleDoc.id);
    expect(doc?.name).toBe(sampleDoc.name);
    expect(doc?.updatedAt).toBe(sampleDoc.updatedAt);
  });

  it('throws on an empty doc id', async () => {
    await expect(renameDoc('', 'Name')).rejects.toThrow(InvariantError);
  });
});
