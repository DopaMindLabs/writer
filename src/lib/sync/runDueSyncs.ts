import { db } from '@/db/db';
import {
  ensureWritePermission,
  getEffectiveIntervalMap,
  getLastSyncForSpace,
  getSyncFolderHandle,
  isFolderSyncSupported,
  syncSpaceToFolder,
} from './folderSync';

export const runDueSyncs = async (): Promise<void> => {
  if (!isFolderSyncSupported()) return;
  const handle = await getSyncFolderHandle();
  if (!handle) return;
  const granted = await ensureWritePermission(handle, { interactive: false });
  if (!granted) return;

  const now = Date.now();
  const spaces = await db.spaces.toArray();
  const intervals = await getEffectiveIntervalMap(spaces.map((s) => s.id));
  for (const space of spaces) {
    const intervalMin = intervals.get(space.id) ?? 0;
    if (intervalMin <= 0) continue;
    const last = await getLastSyncForSpace(space.id);
    const dueAt = (last?.when ?? 0) + intervalMin * 60_000;
    if (now >= dueAt) {
      await syncSpaceToFolder(handle, space, 'auto', { interactive: false });
    }
  }
};
