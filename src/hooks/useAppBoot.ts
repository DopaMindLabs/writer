import { useCallback, useEffect, useState } from 'react';
import { startCloudSession } from '@/lib/cloud/cloudClient';
import { applyDevBootParams } from '@/lib/boot/devBootParams';
import { resetAndReseed } from '@/db/seed';

export interface AppBootState {
  ready: boolean;
  error: Error | null;
  resetLocalData: () => void;
}

const toError = (e: unknown): Error =>
  e instanceof Error ? e : new Error(String(e));

/**
 * Drive application boot: start the cloud session behind `cloudClient`, then
 * apply any development/E2E URL parameters. Exposes a ready flag, a boot error,
 * and a `resetLocalData` escape hatch for the boot error screen. The cloud
 * session is torn down on unmount.
 */
export const useAppBoot = (): AppBootState => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stopSession: (() => void) | null = null;
    const run = async () => {
      stopSession = await startCloudSession();
      await applyDevBootParams();
    };
    run()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(toError(e));
      });
    return () => {
      cancelled = true;
      stopSession?.();
    };
  }, []);

  const resetLocalData = useCallback(() => {
    setReady(false);
    setError(null);
    resetAndReseed()
      .then(() => {
        setReady(true);
      })
      .catch((e: unknown) => {
        setError(toError(e));
      });
  }, []);

  return { ready, error, resetLocalData };
};
