import { db } from '@/db/db';
import { compareTimestamps } from 'writer-sync/core';
import { sampleSection, seedBasicSpace } from '@/test/fixtures';
import { InvariantError } from '@/lib/invariant';
import { renameSection } from './renameSection';

describe('renameSection', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedBasicSpace();
  });

  it('updates the section label', async () => {
    await renameSection(sampleSection.id, 'Renamed section');
    const section = await db.sections.get(sampleSection.id);
    expect(section?.label).toBe('Renamed section');
  });

  it('advances the convergence metadata so the rename replicates', async () => {
    const before = await db.sections.get(sampleSection.id);

    await renameSection(sampleSection.id, 'Renamed section');

    const after = await db.sections.get(sampleSection.id);
    expect(after?.mutationId).not.toBe(before?.mutationId);
    expect(
      compareTimestamps(
        after?.logicalUpdatedAt ?? { millis: 0, counter: 0 },
        before?.logicalUpdatedAt ?? { millis: 0, counter: 0 },
      ),
    ).toBeGreaterThan(0);
  });

  it('trims surrounding whitespace', async () => {
    await renameSection(sampleSection.id, '  Trimmed  ');
    const section = await db.sections.get(sampleSection.id);
    expect(section?.label).toBe('Trimmed');
  });

  it('is a no-op for an empty or whitespace-only label', async () => {
    await renameSection(sampleSection.id, '   ');
    const section = await db.sections.get(sampleSection.id);
    expect(section?.label).toBe(sampleSection.label);
  });

  it('rejects renaming to the reserved Workshop label', async () => {
    await expect(renameSection(sampleSection.id, 'Workshop')).rejects.toThrow(
      InvariantError,
    );
    const section = await db.sections.get(sampleSection.id);
    expect(section?.label).toBe(sampleSection.label);
  });

  it('throws on an empty section id', async () => {
    await expect(renameSection('', 'Name')).rejects.toThrow(InvariantError);
  });
});
