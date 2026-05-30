import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import {
  sampleSpace,
  sampleSection,
  sampleDoc,
  sampleNote,
} from '@/test/fixtures';
import {
  ensureWritePermission,
  getLastSyncedAt,
  syncAllSpacesToFolder,
  syncSpaceToFolder,
} from './folderSync';

interface MockHandle {
  name: string;
  files: Record<string, Blob>;
  getFileHandle: ReturnType<typeof vi.fn>;
}

function makeMockHandle(opts: { fail?: boolean } = {}): MockHandle {
  const files: Record<string, Blob> = {};
  const getFileHandle = vi.fn(async (filename: string) => {
    if (opts.fail) throw new Error('disk full');
    return {
      createWritable: async () => ({
        write: async (blob: Blob) => {
          files[filename] = blob;
        },
        close: async () => {},
      }),
    };
  });
  return { name: 'test-folder', files, getFileHandle };
}

const asHandle = (h: MockHandle) => h as unknown as FileSystemDirectoryHandle;

describe('folderSync', () => {
  beforeEach(async () => {
    // Global setup clears all tables before each test; seed a space here.
    await db.spaces.put(sampleSpace);
    await db.sections.put(sampleSection);
    await db.docs.put(sampleDoc);
    await db.notes.put(sampleNote);
  });

  it('syncSpaceToFolder writes a .zip and records a backup row', async () => {
    const handle = makeMockHandle();
    const filename = await syncSpaceToFolder(asHandle(handle), sampleSpace.id);

    expect(filename).toMatch(/\.zip$/);
    expect(handle.files[filename]).toBeInstanceOf(Blob);
    expect(handle.getFileHandle).toHaveBeenCalledWith(filename, {
      create: true,
    });

    const backups = await db.backups
      .where('scope')
      .equals(sampleSpace.id)
      .toArray();
    expect(backups).toHaveLength(1);
  });

  it('syncAllSpacesToFolder reports per-space success and records lastSyncedAt', async () => {
    const handle = makeMockHandle();
    const run = await syncAllSpacesToFolder(asHandle(handle));

    expect(run.results).toEqual([
      expect.objectContaining({ spaceId: sampleSpace.id, ok: true }),
    ]);
    expect(Object.keys(handle.files)).toHaveLength(1);
    expect(await getLastSyncedAt()).toBe(run.syncedAt);
  });

  it('captures per-space failures without aborting the run', async () => {
    const handle = makeMockHandle({ fail: true });
    const run = await syncAllSpacesToFolder(asHandle(handle));

    expect(run.results[0]).toMatchObject({
      spaceId: sampleSpace.id,
      ok: false,
    });
    expect(run.results[0].error).toContain('disk full');
    // A lastSyncedAt is still recorded for the run.
    expect(await getLastSyncedAt()).toBe(run.syncedAt);
  });

  it('throws when no folder is connected', async () => {
    await expect(syncAllSpacesToFolder()).rejects.toThrow(/no sync folder/i);
  });

  it('ensureWritePermission requests permission when not already granted', async () => {
    const requestPermission = vi.fn(async () => 'granted' as PermissionState);
    const queryPermission = vi.fn(async () => 'prompt' as PermissionState);
    const handle = {
      name: 'f',
      queryPermission,
      requestPermission,
    } as unknown as FileSystemDirectoryHandle;

    const ok = await ensureWritePermission(handle);

    expect(ok).toBe(true);
    expect(requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
  });
});
