import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import type { Backup } from '@/db/schema';
import { buildSpaceArchiveFor } from '@/lib/format/buildSpaceArchive';

export const MAX_BACKUPS_PER_SPACE = 3;


const pruneOldBackups = async (spaceId: string): Promise<void> => {
  const backups = await db.backups.where('scope').equals(spaceId).toArray();
  const staleIds = backups
    .sort((a, b) => b.when - a.when)
    .slice(MAX_BACKUPS_PER_SPACE)
    .map((backup) => backup.id);

  if (staleIds.length > 0) {
    await db.backups.bulkDelete(staleIds);
  }
}

export const createSpaceBackup = async (
  spaceId: string,
  options: { label?: string; kind?: Backup['kind']; now?: () => number } = {},
): Promise<{ backup: Backup; filename: string }> =>  {
  const now = options.now ?? Date.now;
  const when = now();
  const { blob, filename } = await buildSpaceArchiveFor(spaceId, when);

  const backup: Backup = {
    id: newId(),
    when,
    scope: spaceId,
    kind: options.kind ?? 'manual',
    format: 'archive-v2',
    size: blob.size,
    payload: blob,
    label: options.label,
  };
  await db.transaction('rw', db.backups, async () => {
    await db.backups.put(backup);
    await pruneOldBackups(spaceId);
  });
  return { backup, filename };
};

