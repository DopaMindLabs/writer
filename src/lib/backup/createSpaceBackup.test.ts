import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import {
  sampleSpace,
  sampleSection,
  sampleDoc,
  sampleNote,
} from '@/test/fixtures';
import { createSpaceBackup, MAX_BACKUPS_PER_SPACE } from './createSpaceBackup';
describe('createSpaceBackup', () => {
  beforeEach(async () => {
    await db.spaces.put(sampleSpace);
    await db.sections.put(sampleSection);
    await db.docs.put(sampleDoc);
    await db.notes.put(sampleNote);
  });

  it('writes a Backup row with kind=manual, format=archive-v2, and a Blob payload', async () => {
    const fixedWhen = Date.UTC(2026, 4, 16, 12, 0);
    const { backup, filename } = await createSpaceBackup(sampleSpace.id, {
      now: () => fixedWhen,
    });

    expect(filename).toBe('test-space-2026-05-16-1200.zip');
    expect(backup.kind).toBe('manual');
    expect(backup.format).toBe('archive-v2');
    expect(backup.scope).toBe(sampleSpace.id);
    expect(backup.when).toBe(fixedWhen);
    expect(backup.payload).toBeInstanceOf(Blob);
    expect(backup.size).toBe(backup.payload.size);

    const stored = await db.backups.get(backup.id);
    expect(stored).toBeDefined();
    expect(stored?.size).toBe(backup.size);
  });

  it('honours the kind option for pre-restore snapshots', async () => {
    const { backup } = await createSpaceBackup(sampleSpace.id, {
      kind: 'snapshot',
      label: 'pre-restore',
    });
    expect(backup.kind).toBe('snapshot');
    expect(backup.label).toBe('pre-restore');
  });

  it('lists rows for a given scope via useBackups query', async () => {
    await createSpaceBackup(sampleSpace.id);
    await createSpaceBackup(sampleSpace.id);
    const all = await db.backups.where('scope').equals(sampleSpace.id).toArray();
    expect(all).toHaveLength(2);
  });

   it('keeps only the five newest backups for a space', async () => {
    const firstWhen = Date.UTC(2026, 4, 16, 12, 0);
    const createdBackupIds: string[] = [];

    for (let i = 0; i < MAX_BACKUPS_PER_SPACE + 1; i += 1) {
      const { backup } = await createSpaceBackup(sampleSpace.id, {
        now: () => firstWhen + i,
      });
      createdBackupIds.push(backup.id);
    }

    const all = await db.backups.where('scope').equals(sampleSpace.id).toArray();
    expect(all).toHaveLength(MAX_BACKUPS_PER_SPACE);
    expect(await db.backups.get(createdBackupIds[0])).toBeUndefined();
    expect(await db.backups.get(createdBackupIds[1])).toBeDefined();
    expect(
      await db.backups.get(createdBackupIds[createdBackupIds.length - 1]),
    ).toBeDefined();
  });
});
