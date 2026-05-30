import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { db } from '@/db/db';
import { sampleSpace } from '@/test/fixtures';

const isFolderSyncSupported = vi.fn(() => true);
const getSyncFolderHandle = vi.fn();
const ensureWritePermission = vi.fn(async (..._a: unknown[]) => true);
const getEffectiveIntervalMin = vi.fn(async (..._a: unknown[]) => 5);
const getLastSyncForSpace = vi.fn(
  async (..._a: unknown[]): Promise<{ when: number } | undefined> => undefined,
);
const syncSpaceToFolder = vi.fn(async (..._a: unknown[]) => ({}));

vi.mock('./folderSync', () => ({
  isFolderSyncSupported: () => isFolderSyncSupported(),
  getSyncFolderHandle: () => getSyncFolderHandle(),
  ensureWritePermission: (...a: unknown[]) => ensureWritePermission(...a),
  getEffectiveIntervalMin: (...a: unknown[]) => getEffectiveIntervalMin(...a),
  getLastSyncForSpace: (...a: unknown[]) => getLastSyncForSpace(...a),
  syncSpaceToFolder: (...a: unknown[]) => syncSpaceToFolder(...a),
}));

import { runDueSyncs, SyncScheduler } from './SyncScheduler';

const handle = { name: 'folder' } as unknown as FileSystemDirectoryHandle;

beforeEach(async () => {
  vi.clearAllMocks();
  isFolderSyncSupported.mockReturnValue(true);
  getSyncFolderHandle.mockResolvedValue(handle);
  ensureWritePermission.mockResolvedValue(true);
  getEffectiveIntervalMin.mockResolvedValue(5);
  getLastSyncForSpace.mockResolvedValue(undefined);
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

describe('SyncScheduler component', () => {
  it('runs on an interval while mounted', async () => {
    vi.useFakeTimers();
    try {
      render(<SyncScheduler />);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(getSyncFolderHandle).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not schedule when unsupported', () => {
    isFolderSyncSupported.mockReturnValue(false);
    vi.useFakeTimers();
    try {
      const { unmount } = render(<SyncScheduler />);
      vi.advanceTimersByTime(120_000);
      unmount();
      expect(getSyncFolderHandle).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
