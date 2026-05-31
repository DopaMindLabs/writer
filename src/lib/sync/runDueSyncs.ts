import { db } from '@/db/db';
import {
  ensureWritePermission,
  getEffectiveIntervalMin,
  getLastSyncForSpace,
  getSyncFolderHandle,
  isFolderSyncSupported,
  syncSpaceToFolder,
} from './folderSync';

// Auto-sync any space whose configured interval has elapsed. Runs from a timer
// (no user gesture), so it only proceeds when permission was already granted
// this session and never prompts.
export const runDueSyncs = async (): Promise<void> => {
  if (!isFolderSyncSupported()) return;
  const handle = await getSyncFolderHandle();
  if (!handle) return;
  const granted = await ensureWritePermission(handle, { interactive: false });
  if (!granted) return;

  const now = Date.now();
  const spaces = await db.spaces.toArray();
  for (const space of spaces) {
    const intervalMin = await getEffectiveIntervalMin(space.id);
    if (intervalMin <= 0) continue; // off
    const last = await getLastSyncForSpace(space.id);
    const dueAt = (last?.when ?? 0) + intervalMin * 60_000;
    if (now >= dueAt) {
      await syncSpaceToFolder(handle, space, 'auto', { interactive: false });
    }
  }
};
