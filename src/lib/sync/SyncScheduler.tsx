import { useEffect, useRef } from 'react';
import { db } from '@/db/db';
import {
  ensureWritePermission,
  getEffectiveIntervalMin,
  getLastSyncForSpace,
  getSyncFolderHandle,
  isFolderSyncSupported,
  syncSpaceToFolder,
} from './folderSync';

// How often the scheduler wakes to check whether any space is due.
const TICK_MS = 60_000;

export async function runDueSyncs(): Promise<void> {
  if (!isFolderSyncSupported()) return;
  const handle = await getSyncFolderHandle();
  if (!handle) return;
  // Background sync has no user gesture, so only proceed if permission was
  // already granted this session — never prompt from a timer.
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
}

// Mounted once at the app root. Drives periodic auto-sync; renders nothing.
export const SyncScheduler = () => {
  const running = useRef(false);

  useEffect(() => {
    if (!isFolderSyncSupported()) return;
    let cancelled = false;

    const tick = async () => {
      if (running.current || cancelled) return;
      running.current = true;
      try {
        await runDueSyncs();
      } catch {
        // Swallow — auto-sync must never crash the app; failures are recorded
        // per space in the syncs table by syncSpaceToFolder.
      } finally {
        running.current = false;
      }
    };

    const id = window.setInterval(() => void tick(), TICK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return null;
};
