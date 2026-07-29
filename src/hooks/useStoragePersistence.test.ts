import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStoragePersistence } from './useStoragePersistence';

const stubStorage = (persisted: boolean): void => {
  Object.defineProperty(navigator, 'storage', {
    value: { persisted: async () => persisted },
    configurable: true,
  });
};

afterEach(() => {
  Reflect.deleteProperty(navigator, 'storage');
});

describe('useStoragePersistence', () => {
  it('settles on unsupported when the Storage API is unavailable', async () => {
    const { result } = renderHook(() => useStoragePersistence());
    await waitFor(() => {
      expect(result.current).toBe('unsupported');
    });
  });

  it('settles on persistent when the browser granted persistence', async () => {
    stubStorage(true);
    const { result } = renderHook(() => useStoragePersistence());
    await waitFor(() => {
      expect(result.current).toBe('persistent');
    });
  });

  it('settles on best-effort when persistence was not granted', async () => {
    stubStorage(false);
    const { result } = renderHook(() => useStoragePersistence());
    await waitFor(() => {
      expect(result.current).toBe('best-effort');
    });
  });
});
