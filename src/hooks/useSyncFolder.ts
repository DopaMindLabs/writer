import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { isFolderSyncSupported } from '@/lib/sync/folderSync';

export interface SyncFolderState {
  supported: boolean;
  folderName: string | null;
  lastSyncedAt: number | null;
}

export function useSyncFolder(): SyncFolderState {
  const data = useLiveQuery(
    async () => {
      const handleRow = await db.meta.get('syncFolderHandle');
      const lastRow = await db.meta.get('syncLastAt');
      const handle = handleRow?.value as FileSystemDirectoryHandle | undefined;
      return {
        folderName: handle?.name ?? null,
        lastSyncedAt: typeof lastRow?.value === 'number' ? lastRow.value : null,
      };
    },
    [],
    { folderName: null, lastSyncedAt: null },
  );

  return {
    supported: isFolderSyncSupported(),
    folderName: data.folderName,
    lastSyncedAt: data.lastSyncedAt,
  };
}
