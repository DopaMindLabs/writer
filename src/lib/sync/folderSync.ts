import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import type { Space, SyncEntry } from '@/db/schema';
import {
  buildSpaceMarkdownZipFor,
  slugify,
} from '@/lib/backup/buildSpaceMarkdownZip';

// Push-only folder sync built on the File System Access API. Sync is distinct
// from Backup: it writes the space's md-zip into a user-chosen folder (never the
// backups table) and records each run in the `syncs` table. Per space we keep a
// rotating history of MAX_SYNCS_PER_SPACE files plus a stable `latest.zip`, all
// inside a per-space subfolder. The folder handle is persisted in `meta` so it
// survives reloads; browsers require a one-click permission re-grant per session.

const HANDLE_KEY = 'syncFolderHandle';
const GLOBAL_CONFIG_ID = 'global';

export const MAX_SYNCS_PER_SPACE = 5;
export const DEFAULT_INTERVAL_MIN = 10;
export const INHERIT_INTERVAL = -1;
// 0 = off. Used by the settings UI; the global default may not be "inherit".
export const INTERVAL_OPTIONS = [0, 5, 10, 30] as const;
export const LATEST_FILENAME = 'latest.zip';

export const isFolderSyncSupported = (): boolean =>
  typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export const pickSyncFolder = async (): Promise<{ name: string }> => {
  if (!window.showDirectoryPicker) {
    throw new Error('Folder sync is not supported in this browser.');
  }
  const handle = await window.showDirectoryPicker({
    id: 'lipsum-sync',
    mode: 'readwrite',
  });
  await db.meta.put({ key: HANDLE_KEY, value: handle });
  return { name: handle.name };
};

export const getSyncFolderHandle =
  async (): Promise<FileSystemDirectoryHandle | null> => {
    const row = await db.meta.get(HANDLE_KEY);
    return (row?.value as FileSystemDirectoryHandle | undefined) ?? null;
  };

export const forgetSyncFolder = async (): Promise<void> => {
  await db.meta.delete(HANDLE_KEY);
};

export type WritePermissionState =
  | PermissionState // 'granted' | 'prompt' | 'denied'
  | 'no-folder' // nothing connected
  | 'unknown'; // permission API unavailable — treat as usable

// Non-interactively report the current write-permission state of the connected
// folder. Used by the UI to decide whether to show a "reconnect" hint.
export const getWritePermissionState = async (
  handleArg?: FileSystemDirectoryHandle,
): Promise<WritePermissionState> => {
  const handle = handleArg ?? (await getSyncFolderHandle());
  if (!handle) return 'no-folder';
  if (!handle.queryPermission) return 'unknown';
  return handle.queryPermission({ mode: 'readwrite' });
};

// Re-request write permission. Must run inside a user gesture. Returns whether
// permission is now granted.
export const requestFolderPermission = async (
  handleArg?: FileSystemDirectoryHandle,
): Promise<boolean> => {
  const handle = handleArg ?? (await getSyncFolderHandle());
  if (!handle) return false;
  return ensureWritePermission(handle, { interactive: true });
};

// Resolve write permission. With { interactive: false } we only query (never
// prompt) — required for background auto-sync, which has no user gesture.
export const ensureWritePermission = async (
  handle: FileSystemDirectoryHandle,
  { interactive = true }: { interactive?: boolean } = {},
): Promise<boolean> => {
  const opts: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };
  if (handle.queryPermission) {
    const current = await handle.queryPermission(opts);
    if (current === 'granted') return true;
    if (!interactive) return false;
  }
  if (interactive && handle.requestPermission) {
    const next = await handle.requestPermission(opts);
    return next === 'granted';
  }
  // Permission APIs unavailable — assume the handle is usable.
  return !handle.queryPermission;
};

// ---------------------------------------------------------------------------
// Config (global default + per-space override), stored in `syncConfigs`.
// ---------------------------------------------------------------------------

export const getDefaultIntervalMin = async (): Promise<number> => {
  const row = await db.syncConfigs.get(GLOBAL_CONFIG_ID);
  return row ? row.intervalMin : DEFAULT_INTERVAL_MIN;
};

export const setDefaultIntervalMin = async (
  intervalMin: number,
): Promise<void> => {
  await db.syncConfigs.put({ spaceId: GLOBAL_CONFIG_ID, intervalMin });
};

// Per-space interval. INHERIT_INTERVAL means "use the global default".
export const getSpaceIntervalMin = async (spaceId: string): Promise<number> => {
  const row = await db.syncConfigs.get(spaceId);
  return row ? row.intervalMin : INHERIT_INTERVAL;
};

export const setSpaceIntervalMin = async (
  spaceId: string,
  intervalMin: number,
): Promise<void> => {
  await db.syncConfigs.put({ spaceId, intervalMin });
};

export const getEffectiveIntervalMin = async (
  spaceId: string,
): Promise<number> => {
  const own = await getSpaceIntervalMin(spaceId);
  if (own !== INHERIT_INTERVAL) return own;
  return getDefaultIntervalMin();
};

// ---------------------------------------------------------------------------
// Sync history (`syncs` table).
// ---------------------------------------------------------------------------

export const getLastSyncForSpace = async (
  spaceId: string,
): Promise<SyncEntry | undefined> => {
  const rows = await db.syncs.where('spaceId').equals(spaceId).toArray();
  return rows.sort((a, b) => b.when - a.when)[0];
};

export const getLastSyncedAt = async (): Promise<number | null> => {
  const rows = await db.syncs.toArray();
  if (rows.length === 0) return null;
  return rows.reduce((max, r) => Math.max(max, r.when), 0);
};

const pruneSyncHistory = async (spaceId: string): Promise<void> => {
  const rows = await db.syncs.where('spaceId').equals(spaceId).toArray();
  const stale = rows
    .sort((a, b) => b.when - a.when)
    .slice(MAX_SYNCS_PER_SPACE)
    .map((r) => r.id);
  if (stale.length > 0) await db.syncs.bulkDelete(stale);
};

// ---------------------------------------------------------------------------
// Folder writes.
// ---------------------------------------------------------------------------

const spaceDirName = (space: Space): string =>
  // Full space id (a unique primary key) guarantees a distinct subfolder per
  // space, so two spaces with the same name can never overwrite each other. The
  // slug is just a human-readable prefix; nanoid chars are filesystem-safe.
  `${slugify(space.name, 'space')}-${space.id}`;

const isHistoryFilename = (name: string): boolean =>
  name !== LATEST_FILENAME && /\.zip$/i.test(name);

const writeBlobToDir = async (
  dir: FileSystemDirectoryHandle,
  filename: string,
  blob: Blob,
): Promise<void> => {
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
};

const pruneFolderHistory = async (
  dir: FileSystemDirectoryHandle,
): Promise<void> => {
  const names: string[] = [];
  // FileSystemDirectoryHandle is async-iterable over [name, handle] pairs.
  for await (const [name, entry] of dir as unknown as AsyncIterable<
    [string, FileSystemHandle]
  >) {
    if (entry.kind === 'file' && isHistoryFilename(name)) names.push(name);
  }
  // History filenames are timestamp-prefixed, so lexical sort is chronological.
  const stale = names.sort().reverse().slice(MAX_SYNCS_PER_SPACE);
  for (const name of stale) {
    await dir.removeEntry(name).catch(() => {
      // Best-effort cleanup; a failed prune must not fail the sync.
    });
  }
};

const historyFilename = (when: number): string => {
  const d = new Date(when);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${String(d.getUTCFullYear())}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}.zip`
  );
};

// Sync a single space: build the md-zip, write a timestamped history file plus
// the rolling latest.zip, prune to MAX_SYNCS_PER_SPACE, and record the run.
export const syncSpaceToFolder = async (
  handle: FileSystemDirectoryHandle,
  space: Space,
  kind: SyncEntry['kind'],
  { interactive = true }: { interactive?: boolean } = {},
): Promise<SyncEntry> => {
  const when = Date.now();
  try {
    const granted = await ensureWritePermission(handle, { interactive });
    if (!granted) {
      throw new Error('Write permission to the folder was not granted.');
    }
    const { blob } = await buildSpaceMarkdownZipFor(space.id, when);
    const dir = await handle.getDirectoryHandle(spaceDirName(space), {
      create: true,
    });
    const filename = historyFilename(when);
    await writeBlobToDir(dir, filename, blob);
    await writeBlobToDir(dir, LATEST_FILENAME, blob);
    await pruneFolderHistory(dir);

    const entry: SyncEntry = {
      id: newId(),
      spaceId: space.id,
      when,
      kind,
      status: 'ok',
      size: blob.size,
      filename,
    };
    await db.syncs.put(entry);
    await pruneSyncHistory(space.id);
    return entry;
  } catch (err) {
    const entry: SyncEntry = {
      id: newId(),
      spaceId: space.id,
      when,
      kind,
      status: 'error',
      size: 0,
      error: err instanceof Error ? err.message : String(err),
    };
    await db.syncs.put(entry);
    await pruneSyncHistory(space.id);
    return entry;
  }
};

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

const toResult = (space: Space, entry: SyncEntry): SpaceSyncResult => ({
  spaceId: space.id,
  name: space.name,
  ok: entry.status === 'ok',
  error: entry.error,
});

// Manually sync one space. Throws if no folder is connected.
export const syncOneSpace = async (
  spaceId: string,
  kind: SyncEntry['kind'] = 'manual',
  handleArg?: FileSystemDirectoryHandle,
): Promise<SpaceSyncResult> => {
  const handle = handleArg ?? (await getSyncFolderHandle());
  if (!handle) throw new Error('No sync folder is connected.');
  const space = await db.spaces.get(spaceId);
  if (!space) throw new Error(`Space not found: ${spaceId}`);
  const entry = await syncSpaceToFolder(handle, space, kind, {
    interactive: kind === 'manual',
  });
  return toResult(space, entry);
};

// Manually sync every space. Per-space failures are captured, not fatal.
export const syncAllSpacesToFolder = async (
  handleArg?: FileSystemDirectoryHandle,
  kind: SyncEntry['kind'] = 'manual',
): Promise<SyncRunResult> => {
  const handle = handleArg ?? (await getSyncFolderHandle());
  if (!handle) throw new Error('No sync folder is connected.');
  if (kind === 'manual') {
    const granted = await ensureWritePermission(handle, { interactive: true });
    if (!granted) {
      throw new Error('Write permission to the folder was not granted.');
    }
  }

  const spaces = await db.spaces.toArray();
  const results: SpaceSyncResult[] = [];
  for (const space of spaces) {
    const entry = await syncSpaceToFolder(handle, space, kind, {
      interactive: false,
    });
    results.push(toResult(space, entry));
  }
  return { results, syncedAt: Date.now() };
};
