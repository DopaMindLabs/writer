import { useEffect, useRef } from 'react';
import { isFolderSyncSupported } from './folderSync';
import { runDueSyncs } from './runDueSyncs';

const TICK_MS = 60_000;

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
