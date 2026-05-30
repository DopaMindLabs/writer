import { db } from '@/db/db';
import { createSpaceBackup } from '@/lib/backup/createSpaceBackup';

// Push-only folder sync built on the File System Access API. On "Sync now" we
// reuse the existing backup pipeline (createSpaceBackup → md-zip) and write the
// resulting blob into a user-chosen folder. The folder handle is persisted in
// the `meta` table so it survives reloads; browsers still require a one-click
// permission re-grant per session (see ensureWritePermission).

const HANDLE_KEY = 'syncFolderHandle';
const LAST_KEY = 'syncLastAt';

export function isFolderSyncSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function pickSyncFolder(): Promise<{ name: string }> {
  if (!window.showDirectoryPicker) {
    throw new Error('Folder sync is not supported in this browser.');
  }
  const handle = await window.showDirectoryPicker({
    id: 'lipsum-sync',
    mode: 'readwrite',
  });
  await db.meta.put({ key: HANDLE_KEY, value: handle });
  return { name: handle.name };
}

export async function getSyncFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  const row = await db.meta.get(HANDLE_KEY);
  return (row?.value as FileSystemDirectoryHandle | undefined) ?? null;
}

export async function forgetSyncFolder(): Promise<void> {
  await db.meta.delete(HANDLE_KEY);
}

export async function getLastSyncedAt(): Promise<number | null> {
  const row = await db.meta.get(LAST_KEY);
  return typeof row?.value === 'number' ? row.value : null;
}

// Must be called from within a user gesture (e.g. a click handler): browsers
// only re-grant file-system write permission in response to user activation.
export async function ensureWritePermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const opts: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };
  if (handle.queryPermission) {
    const current = await handle.queryPermission(opts);
    if (current === 'granted') return true;
  }
  if (handle.requestPermission) {
    const next = await handle.requestPermission(opts);
    return next === 'granted';
  }
  // Permission APIs unavailable — assume the handle is usable.
  return true;
}

async function writeBlobToFolder(
  handle: FileSystemDirectoryHandle,
  filename: string,
  blob: Blob,
): Promise<void> {
  const fileHandle = await handle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function syncSpaceToFolder(
  handle: FileSystemDirectoryHandle,
  spaceId: string,
): Promise<string> {
  const { backup, filename } = await createSpaceBackup(spaceId);
  await writeBlobToFolder(handle, filename, backup.payload);
  return filename;
}

export interface SpaceSyncResult {
  spaceId: string;
  name: string;
  ok: boolean;
  error?: string;
}

export interface SyncRunResult {
  results: SpaceSyncResult[];
  syncedAt: number;
}

// Pushes every space to the connected folder. The `handle` argument is mainly
// for tests/composition; the UI calls this with no argument so it reads the
// persisted folder handle. Per-space failures are captured rather than aborting
// the whole run.
export async function syncAllSpacesToFolder(
  handleArg?: FileSystemDirectoryHandle,
): Promise<SyncRunResult> {
  const handle = handleArg ?? (await getSyncFolderHandle());
  if (!handle) throw new Error('No sync folder is connected.');

  const granted = await ensureWritePermission(handle);
  if (!granted) {
    throw new Error('Write permission to the folder was not granted.');
  }

  const spaces = await db.spaces.toArray();
  const results: SpaceSyncResult[] = [];
  for (const space of spaces) {
    try {
      await syncSpaceToFolder(handle, space.id);
      results.push({ spaceId: space.id, name: space.name, ok: true });
    } catch (err) {
      results.push({
        spaceId: space.id,
        name: space.name,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const syncedAt = Date.now();
  await db.meta.put({ key: LAST_KEY, value: syncedAt });
  return { results, syncedAt };
}
