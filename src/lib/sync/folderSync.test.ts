import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import {
  sampleSpace,
  sampleSection,
  sampleDoc,
  sampleNote,
} from '@/test/fixtures';
import {
  DEFAULT_INTERVAL_MIN,
  INHERIT_INTERVAL,
  LATEST_FILENAME,
  MAX_SYNCS_PER_SPACE,
  ensureWritePermission,
  forgetSyncFolder,
  getEffectiveIntervalMin,
  getEffectiveIntervalMap,
  getLastSyncForSpace,
  getLastSyncedAt,
  getSyncFolderHandle,
  getWritePermissionState,
  pickSyncFolder,
  requestFolderPermission,
  setDefaultIntervalMin,
  setSpaceIntervalMin,
  syncAllSpacesToFolder,
  syncOneSpace,
  syncSpaceToFolder,
} from './folderSync';

interface MockDir {
  files: Map<string, Blob>;
  getFileHandle: ReturnType<typeof vi.fn>;
  removeEntry: ReturnType<typeof vi.fn>;
  [Symbol.asyncIterator](): AsyncIterator<[string, { kind: string }]>;
}

const makeMockDir = (): MockDir => {
  const files = new Map<string, Blob>();
  return {
    files,
    getFileHandle: vi.fn((name: string) => ({
      createWritable: () => ({
        write: (blob: Blob) => {
          files.set(name, blob);
        },
        close: () => undefined,
      }),
    })),
    // Production code chains `.catch` on this, so it must return a promise.
    removeEntry: vi.fn((name: string) => {
      files.delete(name);
      return Promise.resolve();
    }),
    async *[Symbol.asyncIterator]() {
      await Promise.resolve();
      for (const name of files.keys()) {
        yield [name, { kind: 'file' }] as [string, { kind: string }];
      }
    },
  };
};

interface MockHandle {
  name: string;
  dirs: Map<string, MockDir>;
  getDirectoryHandle: ReturnType<typeof vi.fn>;
}

const makeMockHandle = (opts: { fail?: boolean } = {}): MockHandle => {
  const dirs = new Map<string, MockDir>();
  return {
    name: 'test-folder',
    dirs,
    getDirectoryHandle: vi.fn((name: string) => {
      if (opts.fail) throw new Error('disk full');
      let dir = dirs.get(name);
      if (!dir) {
        dir = makeMockDir();
        dirs.set(name, dir);
      }
      return Promise.resolve(dir);
    }),
  };
};

const asHandle = (h: MockHandle) => h as unknown as FileSystemDirectoryHandle;
const onlyDir = (h: MockHandle) => [...h.dirs.values()][0];

describe('folderSync', () => {
  beforeEach(async () => {
    // Global setup clears all tables before each test; seed a space here.
    await db.spaces.put(sampleSpace);
    await db.sections.put(sampleSection);
    await db.docs.put(sampleDoc);
    await db.notes.put(sampleNote);
  });

  it('writes latest.zip + a history file and records a sync row (not a backup)', async () => {
    const handle = makeMockHandle();
    const entry = await syncSpaceToFolder(asHandle(handle), sampleSpace, 'manual');

    expect(entry.status).toBe('ok');
    const dir = onlyDir(handle);
    expect(dir.files.get(LATEST_FILENAME)).toBeInstanceOf(Blob);
    const historyNames = [...dir.files.keys()].filter(
      (n) => n !== LATEST_FILENAME,
    );
    expect(historyNames).toHaveLength(1);
    expect(historyNames[0]).toMatch(/\.zip$/);

    const syncs = await db.syncs.where('spaceId').equals(sampleSpace.id).toArray();
    expect(syncs).toHaveLength(1);
    // Sync must NOT create a backup row.
    const backups = await db.backups.where('scope').equals(sampleSpace.id).toArray();
    expect(backups).toHaveLength(0);
  });

  it('keeps same-named spaces in separate subfolders', async () => {
    // Two distinct spaces sharing a name must not collide.
    const spaceB = {
      ...sampleSpace,
      id: 'space-b-00000000',
      name: sampleSpace.name,
    };
    await db.spaces.put(spaceB);

    const handle = makeMockHandle();
    await syncSpaceToFolder(asHandle(handle), sampleSpace, 'manual');
    await syncSpaceToFolder(asHandle(handle), spaceB, 'manual');

    expect(handle.dirs.size).toBe(2);
    for (const dir of handle.dirs.values()) {
      expect(dir.files.get(LATEST_FILENAME)).toBeInstanceOf(Blob);
    }
  });

  it('syncAllSpacesToFolder reports success and records lastSyncedAt', async () => {
    const handle = makeMockHandle();
    const run = await syncAllSpacesToFolder(asHandle(handle));

    expect(run.results).toEqual([
      expect.objectContaining({ spaceId: sampleSpace.id, ok: true }),
    ]);
    expect(await getLastSyncedAt()).not.toBeNull();
  });

  it('captures per-space failures without aborting the run', async () => {
    const handle = makeMockHandle({ fail: true });
    const run = await syncAllSpacesToFolder(asHandle(handle));

    expect(run.results[0]).toMatchObject({ spaceId: sampleSpace.id, ok: false });
    expect(run.results[0].error).toContain('disk full');
    const syncs = await db.syncs.where('spaceId').equals(sampleSpace.id).toArray();
    expect(syncs[0].status).toBe('error');
  });

  it('keeps only the last MAX_SYNCS_PER_SPACE history rows', async () => {
    const handle = makeMockHandle();
    for (let i = 0; i < MAX_SYNCS_PER_SPACE + 2; i += 1) {
      await syncSpaceToFolder(asHandle(handle), sampleSpace, 'auto');
    }
    const syncs = await db.syncs.where('spaceId').equals(sampleSpace.id).toArray();
    expect(syncs).toHaveLength(MAX_SYNCS_PER_SPACE);
  });

  it('throws when no folder is connected', async () => {
    await expect(syncAllSpacesToFolder()).rejects.toThrow(/no sync folder/i);
  });

  it('records an error when write permission is denied for a space', async () => {
    const handle = {
      name: 'denied',
      queryPermission: vi.fn(() => Promise.resolve('denied')),
      requestPermission: vi.fn(() => Promise.resolve('denied')),
    } as unknown as FileSystemDirectoryHandle;
    const entry = await syncSpaceToFolder(handle, sampleSpace, 'manual');
    expect(entry.status).toBe('error');
    expect(entry.error).toMatch(/permission/i);
  });

  it('throws when manual sync-all is denied write permission', async () => {
    const handle = {
      name: 'denied',
      queryPermission: vi.fn(() => Promise.resolve('denied')),
      requestPermission: vi.fn(() => Promise.resolve('denied')),
    } as unknown as FileSystemDirectoryHandle;
    await expect(syncAllSpacesToFolder(handle, 'manual')).rejects.toThrow(
      /permission/i,
    );
  });

  it('getWritePermissionState is "unknown" when the stored handle has no permission API', async () => {
    await db.meta.put({ key: 'syncFolderHandle', value: { name: 'x' } });
    expect(await getWritePermissionState()).toBe('unknown');
  });

  it('requestFolderPermission resolves via the stored handle', async () => {
    await db.meta.put({ key: 'syncFolderHandle', value: { name: 'stored' } });
    expect(await requestFolderPermission()).toBe(true);
  });

  it('syncOneSpace uses the stored handle when none is passed', async () => {
    await db.meta.put({ key: 'syncFolderHandle', value: { name: 'stored' } });
    const res = await syncOneSpace(sampleSpace.id);
    expect(res).toMatchObject({ spaceId: sampleSpace.id, ok: false });
  });

  it('falls back to the stored handle when none is passed', async () => {
    await db.meta.put({ key: 'syncFolderHandle', value: { name: 'stored' } });
    const run = await syncAllSpacesToFolder(undefined, 'auto');
    // The stored plain handle has no getDirectoryHandle, so the write fails —
    // but the guard passed via getSyncFolderHandle().
    expect(run.results[0]).toMatchObject({ spaceId: sampleSpace.id, ok: false });
  });

  it('syncAllSpacesToFolder skips the permission gate for auto runs', async () => {
    const handle = makeMockHandle();
    const run = await syncAllSpacesToFolder(asHandle(handle), 'auto');
    expect(run.results[0]).toMatchObject({ spaceId: sampleSpace.id, ok: true });
  });

  it('ensureWritePermission returns true when permission is already granted', async () => {
    const handle = {
      queryPermission: vi.fn(() => Promise.resolve('granted')),
    } as unknown as FileSystemDirectoryHandle;
    expect(await ensureWritePermission(handle)).toBe(true);
  });

  it('getLastSyncForSpace returns the newest of several entries', async () => {
    await db.syncs.bulkPut([
      { id: '1', spaceId: sampleSpace.id, when: 100, kind: 'manual', status: 'ok', size: 1 },
      { id: '2', spaceId: sampleSpace.id, when: 200, kind: 'auto', status: 'ok', size: 2 },
    ]);
    const last = await getLastSyncForSpace(sampleSpace.id);
    expect(last?.id).toBe('2');
  });

  it('getLastSyncForSpace picks the newest regardless of insertion order and scopes to the space', async () => {
    await db.syncs.bulkPut([
      { id: 'a', spaceId: sampleSpace.id, when: 300, kind: 'auto', status: 'ok', size: 1 },
      { id: 'b', spaceId: sampleSpace.id, when: 100, kind: 'auto', status: 'ok', size: 1 },
      { id: 'c', spaceId: sampleSpace.id, when: 200, kind: 'auto', status: 'ok', size: 1 },
      // A newer entry for a different space must not win.
      { id: 'other', spaceId: 'other-space', when: 999, kind: 'auto', status: 'ok', size: 1 },
    ]);
    const last = await getLastSyncForSpace(sampleSpace.id);
    expect(last?.id).toBe('a');
    expect(last?.when).toBe(300);
  });

  it('getLastSyncForSpace returns undefined when a space has no syncs', async () => {
    expect(await getLastSyncForSpace('never-synced')).toBeUndefined();
  });

  it('getEffectiveIntervalMap resolves defaults, inheritance and overrides in one read', async () => {
    await setDefaultIntervalMin(30);
    await setSpaceIntervalMin('override', 5);
    await setSpaceIntervalMin('inherits', INHERIT_INTERVAL);
    const map = await getEffectiveIntervalMap(['override', 'inherits', 'unset']);
    expect(map.get('override')).toBe(5);
    expect(map.get('inherits')).toBe(30);
    expect(map.get('unset')).toBe(30);
  });

  it('tolerates a failed history prune without failing the sync', async () => {
    const files = new Map<string, Blob>();
    for (let i = 0; i < MAX_SYNCS_PER_SPACE + 2; i += 1) {
      files.set(`2026-01-${String(i).padStart(2, '0')}-000000.zip`, new Blob(['x']));
    }
    const dir = {
      getFileHandle: vi.fn(() => ({
        createWritable: () => ({
          write: () => undefined,
          close: () => undefined,
        }),
      })),
      // Best-effort cleanup: removeEntry rejects, which must not fail the sync.
      removeEntry: vi.fn(() => Promise.reject(new Error('locked'))),
      async *[Symbol.asyncIterator]() {
        await Promise.resolve();
        for (const name of files.keys()) {
          yield [name, { kind: 'file' }] as [string, { kind: string }];
        }
      },
    };
    const handle = {
      name: 'prune',
      getDirectoryHandle: vi.fn(() => Promise.resolve(dir)),
    } as unknown as FileSystemDirectoryHandle;
    const entry = await syncSpaceToFolder(handle, sampleSpace, 'manual');
    expect(entry.status).toBe('ok');
  });

  it('ensureWritePermission requests permission when interactive and not granted', async () => {
    const requestPermission = vi.fn(() => Promise.resolve('granted'));
    const queryPermission = vi.fn(() => Promise.resolve('prompt'));
    const handle = {
      name: 'f',
      queryPermission,
      requestPermission,
    } as unknown as FileSystemDirectoryHandle;

    expect(await ensureWritePermission(handle)).toBe(true);
    expect(requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
  });

  it('ensureWritePermission never prompts when non-interactive', async () => {
    const requestPermission = vi.fn(() => Promise.resolve('granted'));
    const queryPermission = vi.fn(() => Promise.resolve('prompt'));
    const handle = {
      name: 'f',
      queryPermission,
      requestPermission,
    } as unknown as FileSystemDirectoryHandle;

    expect(await ensureWritePermission(handle, { interactive: false })).toBe(
      false,
    );
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('resolves the effective interval from default + per-space override', async () => {
    // No config rows → falls back to the default constant.
    expect(await getEffectiveIntervalMin(sampleSpace.id)).toBe(
      DEFAULT_INTERVAL_MIN,
    );

    await setDefaultIntervalMin(30);
    expect(await getEffectiveIntervalMin(sampleSpace.id)).toBe(30);

    await setSpaceIntervalMin(sampleSpace.id, 5);
    expect(await getEffectiveIntervalMin(sampleSpace.id)).toBe(5);

    // Inherit → back to the default.
    await setSpaceIntervalMin(sampleSpace.id, INHERIT_INTERVAL);
    expect(await getEffectiveIntervalMin(sampleSpace.id)).toBe(30);
  });

  it('pick/get/forget the folder handle via meta', async () => {
    const picked = { name: 'picked-folder' };
    (window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker =
      vi.fn(() => Promise.resolve(picked));
    try {
      const { name } = await pickSyncFolder();
      expect(name).toBe('picked-folder');
      const handle = await getSyncFolderHandle();
      expect(handle).toMatchObject({ name: 'picked-folder' });
      await forgetSyncFolder();
      expect(await getSyncFolderHandle()).toBeNull();
    } finally {
      delete (window as unknown as { showDirectoryPicker?: unknown })
        .showDirectoryPicker;
    }
  });

  it('pickSyncFolder throws when the API is unavailable', async () => {
    await expect(pickSyncFolder()).rejects.toThrow(/not supported/i);
  });

  it('syncOneSpace syncs a single space and records its last sync', async () => {
    const handle = makeMockHandle();
    const res = await syncOneSpace(sampleSpace.id, 'manual', asHandle(handle));
    expect(res).toMatchObject({ spaceId: sampleSpace.id, ok: true });
    const last = await getLastSyncForSpace(sampleSpace.id);
    expect(last?.status).toBe('ok');
  });

  it('syncOneSpace rejects an unknown space', async () => {
    const handle = makeMockHandle();
    await expect(
      syncOneSpace('nope', 'manual', asHandle(handle)),
    ).rejects.toThrow(/space not found/i);
  });

  it('syncOneSpace throws when no folder is connected', async () => {
    await expect(syncOneSpace(sampleSpace.id)).rejects.toThrow(/no sync folder/i);
  });

  it('prunes folder history to the most recent files', async () => {
    const handle = makeMockHandle();
    const base = Date.UTC(2026, 0, 1, 0, 0, 0);
    const spy = vi.spyOn(Date, 'now');
    try {
      for (let i = 0; i < MAX_SYNCS_PER_SPACE + 2; i += 1) {
        // Space writes one history file per second → distinct filenames.
        spy.mockReturnValue(base + i * 1000);
        await syncSpaceToFolder(asHandle(handle), sampleSpace, 'auto');
      }
    } finally {
      spy.mockRestore();
    }
    const dir = onlyDir(handle);
    const historyNames = [...dir.files.keys()].filter(
      (n) => n !== LATEST_FILENAME,
    );
    expect(historyNames).toHaveLength(MAX_SYNCS_PER_SPACE);
    expect(dir.removeEntry).toHaveBeenCalled();
  });

  it('ensureWritePermission allows handles without permission APIs', async () => {
    const handle = { name: 'plain' } as unknown as FileSystemDirectoryHandle;
    expect(await ensureWritePermission(handle)).toBe(true);
  });

  it('getLastSyncedAt is null before any sync', async () => {
    expect(await getLastSyncedAt()).toBeNull();
  });

  it('getWritePermissionState reflects the handle (or no-folder)', async () => {
    expect(await getWritePermissionState()).toBe('no-folder');

    const prompt = {
      name: 'p',
      queryPermission: vi.fn(() => Promise.resolve('prompt')),
    } as unknown as FileSystemDirectoryHandle;
    expect(await getWritePermissionState(prompt)).toBe('prompt');

    const noApi = { name: 'n' } as unknown as FileSystemDirectoryHandle;
    expect(await getWritePermissionState(noApi)).toBe('unknown');
  });

  it('requestFolderPermission returns false with no folder, true once granted', async () => {
    expect(await requestFolderPermission()).toBe(false);

    const handle = {
      name: 'g',
      queryPermission: vi.fn(() => Promise.resolve('prompt')),
      requestPermission: vi.fn(() => Promise.resolve('granted')),
    } as unknown as FileSystemDirectoryHandle;
    expect(await requestFolderPermission(handle)).toBe(true);
  });
});
