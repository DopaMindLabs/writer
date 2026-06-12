import { describe, expect, it, vi } from 'vitest';
import { Doc } from 'yjs';
import { createLocalProvider } from './LocalProvider';

describe('createLocalProvider', () => {
  it('emits sync(true) once connect is awaited and stops after off', async () => {
    const provider = createLocalProvider(new Doc());
    const onSync = vi.fn();
    provider.on('sync', onSync);
    provider.connect();
    await Promise.resolve();
    expect(onSync).toHaveBeenCalledWith(true);
    provider.off('sync', onSync);
    provider.connect();
    await Promise.resolve();
    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('exposes a no-op awareness with no remote states', () => {
    const provider = createLocalProvider(new Doc());
    expect(provider.awareness.getLocalState()).toBeNull();
    expect(provider.awareness.getStates().size).toBe(0);
  });
});
