import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import { errorMessage } from '@/lib/errorMessage';
import type { Space, SyncEntry } from '@/db/schema';
import {
  buildSpaceMarkdownZipFor,
  slugify,
} from '@/lib/backup/buildSpaceMarkdownZip';

const HANDLE_KEY = 'syncFolderHandle';
const GLOBAL_CONFIG_ID = 'global';

export const MAX_SYNCS_PER_SPACE = 5;
export const DEFAULT_INTERVAL_MIN = 10;
export const INHERIT_INTERVAL = -1;
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
  | PermissionState
  | 'no-folder'
  | 'unknown';

export const getWritePermissionState = async (
  handleArg?: FileSystemDirectoryHandle,
): Promise<WritePermissionState> => {
  const handle = handleArg ?? (await getSyncFolderHandle());
  if (!handle) return 'no-folder';
  if (!handle.queryPermission) return 'unknown';
  return handle.queryPermission({ mode: 'readwrite' });
};

export const requestFolderPermission = async (
  handleArg?: FileSystemDirectoryHandle,
): Promise<boolean> => {
  const handle = handleArg ?? (await getSyncFolderHandle());
  if (!handle) return false;
  return ensureWritePermission(handle, { interactive: true });
};

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
  return !handle.queryPermission;
};

export const getDefaultIntervalMin = async (): Promise<number> => {
  const row = await db.syncConfigs.get(GLOBAL_CONFIG_ID);
  return row ? row.intervalMin : DEFAULT_INTERVAL_MIN;
};

export const setDefaultIntervalMin = async (
  intervalMin: number,
): Promise<void> => {
  await db.syncConfigs.put({ spaceId: GLOBAL_CONFIG_ID, intervalMin });
};

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

export const getEffectiveIntervalMap = async (
  spaceIds: string[],
): Promise<Map<string, number>> => {
  const configs = await db.syncConfigs.toArray();
  const byId = new Map(configs.map((c) => [c.spaceId, c.intervalMin]));
  const defaultMin = byId.get(GLOBAL_CONFIG_ID) ?? DEFAULT_INTERVAL_MIN;
  const out = new Map<string, number>();
  for (const id of spaceIds) {
    const own = byId.get(id) ?? INHERIT_INTERVAL;
    out.set(id, own === INHERIT_INTERVAL ? defaultMin : own);
  }
  return out;
};

export const getLastSyncForSpace = async (
  spaceId: string,
): Promise<SyncEntry | undefined> => {
  return db.syncs
    .where('[spaceId+when]')
    .between([spaceId, -Infinity], [spaceId, Infinity])
    .reverse()
    .first();
};

export const getLastSyncedAt = async (): Promise<number | null> => {
  const last = await db.syncs.orderBy('when').last();
  return last?.when ?? null;
};

const pruneSyncHistory = async (spaceId: string): Promise<void> => {
  const rows = await db.syncs.where('spaceId').equals(spaceId).toArray();
  const stale = rows
    .sort((a, b) => b.when - a.when)
    .slice(MAX_SYNCS_PER_SPACE)
    .map((r) => r.id);
  if (stale.length > 0) await db.syncs.bulkDelete(stale);
};

const spaceDirName = (space: Space): string =>
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
  // nasa-exception: no-unsafe-type-assertion (FSAA async-iterable untyped in lib.dom)
  for await (const [name, entry] of dir as unknown as AsyncIterable<
    [string, FileSystemHandle]
  >) {
    if (entry.kind === 'file' && isHistoryFilename(name)) names.push(name);
  }
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
      error: errorMessage(err),
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
