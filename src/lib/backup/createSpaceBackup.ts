import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import type { Backup } from '@/db/schema';
import { buildSpaceMarkdownZipFor } from './buildSpaceMarkdownZip';

export async function createSpaceBackup(
  spaceId: string,
  options: { label?: string; now?: () => number } = {},
): Promise<{ backup: Backup; filename: string }> {
  const now = options.now ?? Date.now;
  const when = now();
  const { blob, filename } = await buildSpaceMarkdownZipFor(spaceId, when);

  const backup: Backup = {
    id: newId(),
    when,
    scope: spaceId,
    kind: 'manual',
    format: 'md-zip',
    size: blob.size,
    payload: blob,
    label: options.label,
  };
  await db.backups.put(backup);
  return { backup, filename };
}
