import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { getLastSyncedAt, isFolderSyncSupported } from '@/lib/sync/folderSync';

export interface SyncFolderState {
  supported: boolean;
  folderName: string | null;
  lastSyncedAt: number | null;
}

export const useSyncFolder = (): SyncFolderState => {
  const data = useLiveQuery(
    async () => {
      const handleRow = await db.meta.get('syncFolderHandle');
      const handle = handleRow?.value as FileSystemDirectoryHandle | undefined;
      const lastSyncedAt = await getLastSyncedAt();
      return { folderName: handle?.name ?? null, lastSyncedAt };
    },
    [],
    { folderName: null, lastSyncedAt: null },
  );

  return {
    supported: isFolderSyncSupported(),
    folderName: data.folderName,
    lastSyncedAt: data.lastSyncedAt,
  };
};
