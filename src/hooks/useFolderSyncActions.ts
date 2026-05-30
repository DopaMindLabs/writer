import { useState } from 'react';
import {
  forgetSyncFolder,
  pickSyncFolder,
  syncAllSpacesToFolder,
  syncOneSpace,
  type SpaceSyncResult,
} from '@/lib/sync/folderSync';
import { isAbort } from '@/components/settings/sync/abort';

export interface FolderSyncActions {
  busy: boolean;
  error: string | null;
  /** Per-space outcomes of the last "sync all" run; null in single-space mode. */
  results: SpaceSyncResult[] | null;
  choose: () => Promise<void>;
  disconnect: () => Promise<void>;
  sync: () => Promise<void>;
}

/**
 * Imperative folder-sync actions + transient UI state for the Sync settings
 * tabs. Pass a `spaceId` to sync a single space; omit it to sync all spaces.
 */
export const useFolderSyncActions = (spaceId?: string): FolderSyncActions => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SpaceSyncResult[] | null>(null);

  const fail = (err: unknown): void => {
    if (isAbort(err)) return;
    setError(err instanceof Error ? err.message : String(err));
  };

  const choose = async (): Promise<void> => {
    setError(null);
    try {
      await pickSyncFolder();
    } catch (err) {
      fail(err);
    }
  };

  const disconnect = async (): Promise<void> => {
    setResults(null);
    await forgetSyncFolder();
  };

  const sync = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      if (spaceId === undefined) {
        const run = await syncAllSpacesToFolder();
        setResults(run.results);
      } else {
        const res = await syncOneSpace(spaceId);
        if (!res.ok) setError(res.error ?? 'Sync failed');
      }
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, results, choose, disconnect, sync };
};
