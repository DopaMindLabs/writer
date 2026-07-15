import { describe, it, expect, vi } from 'vitest';
import { startDeviceRegistrar } from './deviceRegistrar';

interface SyncStub {
  observable: {
    subscribe: (next: (s: { phase: string }) => void) => { unsubscribe: () => void };
  };
  emit: (phase: string) => void;
}

const syncStub = (): SyncStub => {
  let listener: ((s: { phase: string }) => void) | null = null;
  return {
    observable: {
      subscribe: (next) => {
        listener = next;
        return { unsubscribe: () => { listener = null; } };
      },
    },
    emit: (phase) => listener?.({ phase }),
  };
};

interface UserStub {
  observable: {
    subscribe: (
      next: (u: { isLoggedIn: boolean } | undefined) => void,
    ) => { unsubscribe: () => void };
  };
  emit: (user: { isLoggedIn: boolean } | undefined) => void;
}

const userStub = (): UserStub => {
  let listener: ((u: { isLoggedIn: boolean } | undefined) => void) | null = null;
  return {
    observable: {
      subscribe: (next) => {
        listener = next;
        return { unsubscribe: () => { listener = null; } };
      },
    },
    emit: (user) => listener?.(user),
  };
};

const keyChangeStub = () => {
  let listener: (() => void) | null = null;
  return {
    onKeyChange: (l: () => void) => {
      listener = l;
      return () => { listener = null; };
    },
    emit: () => listener?.(),
  };
};

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('startDeviceRegistrar', () => {
  it('runs when sync settles into in-sync', async () => {
    const sync = syncStub();
    const run = vi.fn().mockResolvedValue(undefined);
    const stop = startDeviceRegistrar({ syncState: sync.observable, run });

    sync.emit('pulling');
    expect(run).not.toHaveBeenCalled();
    sync.emit('in-sync');
    await settle();
    expect(run).toHaveBeenCalledTimes(1);
    stop();
  });

  it('runs on a sign-in identity change and on key acquisition', async () => {
    const user = userStub();
    const keys = keyChangeStub();
    const run = vi.fn().mockResolvedValue(undefined);
    const stop = startDeviceRegistrar({
      currentUser: user.observable,
      onKeyChange: keys.onKeyChange,
      run,
    });

    user.emit({ isLoggedIn: true });
    await settle();
    expect(run).toHaveBeenCalledTimes(1);

    keys.emit();
    await settle();
    expect(run).toHaveBeenCalledTimes(2);
    stop();
  });

  it('stops re-running after unsubscribe', async () => {
    const sync = syncStub();
    const run = vi.fn().mockResolvedValue(undefined);
    const stop = startDeviceRegistrar({ syncState: sync.observable, run });
    stop();

    sync.emit('in-sync');
    await settle();
    expect(run).not.toHaveBeenCalled();
  });
});
