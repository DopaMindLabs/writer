import { db } from '@/db/db';
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
