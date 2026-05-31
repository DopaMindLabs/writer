import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { sampleSpace } from '@/test/fixtures';

const isFolderSyncSupported = vi.fn<() => boolean>(() => true);
const getSyncFolderHandle = vi.fn<() => Promise<unknown>>();
const ensureWritePermission = vi.fn<(...a: unknown[]) => Promise<boolean>>();
const getEffectiveIntervalMin = vi.fn<(...a: unknown[]) => Promise<number>>();
const getLastSyncForSpace =
  vi.fn<(...a: unknown[]) => Promise<{ when: number } | undefined>>();
const syncSpaceToFolder = vi.fn<(...a: unknown[]) => Promise<unknown>>();

vi.mock('./folderSync', () => ({
  isFolderSyncSupported: () => isFolderSyncSupported(),
  getSyncFolderHandle: () => getSyncFolderHandle(),
  ensureWritePermission: (...a: unknown[]) => ensureWritePermission(...a),
  getEffectiveIntervalMin: (...a: unknown[]) => getEffectiveIntervalMin(...a),
  getLastSyncForSpace: (...a: unknown[]) => getLastSyncForSpace(...a),
  syncSpaceToFolder: (...a: unknown[]) => syncSpaceToFolder(...a),
}));

import { runDueSyncs } from './runDueSyncs';

const handle = { name: 'folder' } as unknown as FileSystemDirectoryHandle;

beforeEach(async () => {
  vi.clearAllMocks();
  isFolderSyncSupported.mockReturnValue(true);
  getSyncFolderHandle.mockResolvedValue(handle);
  ensureWritePermission.mockResolvedValue(true);
  getEffectiveIntervalMin.mockResolvedValue(5);
  getLastSyncForSpace.mockResolvedValue(undefined);
  syncSpaceToFolder.mockResolvedValue({});
  await db.spaces.put(sampleSpace);
});

describe('runDueSyncs', () => {
  it('auto-syncs a space that is due', async () => {
    await runDueSyncs();
    expect(syncSpaceToFolder).toHaveBeenCalledTimes(1);
    expect(syncSpaceToFolder).toHaveBeenCalledWith(
      handle,
      expect.objectContaining({ id: sampleSpace.id }),
      'auto',
      { interactive: false },
    );
  });

  it('skips when the interval is off', async () => {
    getEffectiveIntervalMin.mockResolvedValue(0);
    await runDueSyncs();
    expect(syncSpaceToFolder).not.toHaveBeenCalled();
  });

  it('skips when the space is not yet due', async () => {
    getLastSyncForSpace.mockResolvedValue({ when: Date.now() });
    await runDueSyncs();
    expect(syncSpaceToFolder).not.toHaveBeenCalled();
  });

  it('does nothing when no folder is connected', async () => {
    getSyncFolderHandle.mockResolvedValue(null);
    await runDueSyncs();
    expect(ensureWritePermission).not.toHaveBeenCalled();
    expect(syncSpaceToFolder).not.toHaveBeenCalled();
  });

  it('does nothing without granted permission', async () => {
    ensureWritePermission.mockResolvedValue(false);
    await runDueSyncs();
    expect(syncSpaceToFolder).not.toHaveBeenCalled();
  });

  it('does nothing when unsupported', async () => {
    isFolderSyncSupported.mockReturnValue(false);
    await runDueSyncs();
    expect(getSyncFolderHandle).not.toHaveBeenCalled();
  });
});
