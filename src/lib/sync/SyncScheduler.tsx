import { useEffect, useRef } from 'react';
import { isFolderSyncSupported } from './folderSync';
import { runDueSyncs } from './runDueSyncs';

// How often the scheduler wakes to check whether any space is due.
const TICK_MS = 60_000;

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
