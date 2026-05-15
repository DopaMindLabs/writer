import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import {
  sampleSpace,
  sampleSection,
  sampleDoc,
  sampleNote,
} from '@/test/fixtures';
import { createSpaceBackup } from './createSpaceBackup';

describe('createSpaceBackup', () => {
  beforeEach(async () => {
    await db.spaces.put(sampleSpace);
    await db.sections.put(sampleSection);
    await db.docs.put(sampleDoc);
    await db.notes.put(sampleNote);
  });

  it('writes a Backup row with kind=manual, format=md-zip, and a Blob payload', async () => {
    const fixedWhen = Date.UTC(2026, 4, 16, 12, 0);
    const { backup, filename } = await createSpaceBackup(sampleSpace.id, {
      now: () => fixedWhen,
    });

    expect(filename).toBe('test-space-2026-05-16-1200.zip');
    expect(backup.kind).toBe('manual');
    expect(backup.format).toBe('md-zip');
    expect(backup.scope).toBe(sampleSpace.id);
    expect(backup.when).toBe(fixedWhen);
    expect(backup.payload).toBeInstanceOf(Blob);
    expect(backup.size).toBe(backup.payload.size);

    const stored = await db.backups.get(backup.id);
    expect(stored).toBeDefined();
    expect(stored?.size).toBe(backup.size);
  });

  it('lists rows for a given scope via useBackups query', async () => {
    await createSpaceBackup(sampleSpace.id);
    await createSpaceBackup(sampleSpace.id);
    const all = await db.backups.where('scope').equals(sampleSpace.id).toArray();
    expect(all).toHaveLength(2);
  });
});
