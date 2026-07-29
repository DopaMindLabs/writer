import { describe, it, expect, afterEach } from 'vitest';
import { queryPersistence, requestPersistentStorage } from './persistentStorage';

const stubStorage = (
  stub: Partial<{ persist: () => Promise<boolean>; persisted: () => Promise<boolean> }>,
): void => {
  Object.defineProperty(navigator, 'storage', {
    value: stub,
    configurable: true,
  });
};

afterEach(() => {
  Reflect.deleteProperty(navigator, 'storage');
});

describe('requestPersistentStorage', () => {
  it('resolves false when the Storage API is unavailable', async () => {
    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it('resolves the browser decision when the API exists', async () => {
    stubStorage({ persist: async () => true });
    await expect(requestPersistentStorage()).resolves.toBe(true);
  });

  it('resolves false when the browser declines', async () => {
    stubStorage({ persist: async () => false });
    await expect(requestPersistentStorage()).resolves.toBe(false);
  });
});

describe('queryPersistence', () => {
  it('reports unsupported without the Storage API', async () => {
    await expect(queryPersistence()).resolves.toBe('unsupported');
  });

  it('reports persistent when the browser granted persistence', async () => {
    stubStorage({ persisted: async () => true });
    await expect(queryPersistence()).resolves.toBe('persistent');
  });

  it('reports best-effort when persistence was not granted', async () => {
    stubStorage({ persisted: async () => false });
    await expect(queryPersistence()).resolves.toBe('best-effort');
  });
});
