import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const isFolderSyncSupported = vi.fn<() => boolean>(() => true);
const runDueSyncs = vi.fn<() => Promise<void>>();

vi.mock('./folderSync', () => ({
  isFolderSyncSupported: () => isFolderSyncSupported(),
}));
vi.mock('./runDueSyncs', () => ({
  runDueSyncs: () => runDueSyncs(),
}));

import { SyncScheduler } from './SyncScheduler';

beforeEach(() => {
  vi.clearAllMocks();
  isFolderSyncSupported.mockReturnValue(true);
  runDueSyncs.mockResolvedValue();
});

describe('SyncScheduler component', () => {
  it('runs on an interval while mounted', async () => {
    vi.useFakeTimers();
    try {
      render(<SyncScheduler />);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(runDueSyncs).toHaveBeenCalled();
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
      expect(runDueSyncs).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
