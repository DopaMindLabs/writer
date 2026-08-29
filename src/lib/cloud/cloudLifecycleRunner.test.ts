import { describe, expect, it, vi } from 'vitest';
import { startCloudLifecycleRunner } from './cloudLifecycleRunner';

interface SyncStub {
  observable: {
    subscribe: (next: (s: { phase: string }) => void) => { unsubscribe: () => void };
  };
  emit: (phase: string) => void;
}

const syncStub = (): SyncStub => {
  const listeners: ((s: { phase: string }) => void)[] = [];
  return {
    observable: {
      subscribe: (next) => {
        listeners.push(next);
        return { unsubscribe: () => undefined };
      },
    },
    emit: (phase) => {
      for (const listener of listeners) listener({ phase });
    },
  };
};

const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('startCloudLifecycleRunner', () => {
  it('coalesces triggers that land while a run is in flight into one follow-up', async () => {
    const sync = syncStub();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const run = vi.fn().mockImplementationOnce(() => gate).mockResolvedValue(undefined);
    const stop = startCloudLifecycleRunner({ syncState: sync.observable, run });

    sync.emit('in-sync');
    await settled();
    expect(run).toHaveBeenCalledTimes(1);

    // Two more triggers arrive while the first run is still in flight: they
    // must coalesce into exactly one follow-up, not queue one run each.
    sync.emit('pulling');
    sync.emit('in-sync');
    sync.emit('pulling');
    sync.emit('in-sync');
    expect(run).toHaveBeenCalledTimes(1);

    release();
    await settled();
    expect(run).toHaveBeenCalledTimes(2);
    stop();
  });

  it('survives a run that rejects and still runs on the next trigger', async () => {
    const sync = syncStub();
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue(undefined);
    const stop = startCloudLifecycleRunner({ syncState: sync.observable, run });

    sync.emit('in-sync');
    await settled();
    expect(run).toHaveBeenCalledTimes(1);

    sync.emit('pulling');
    sync.emit('in-sync');
    await settled();
    expect(run).toHaveBeenCalledTimes(2);
    stop();
  });
});
