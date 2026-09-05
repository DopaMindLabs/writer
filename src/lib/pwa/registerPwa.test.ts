import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn(() => vi.fn()) }));

const { registerSW } = await import('virtual:pwa-register');
const { registerPwa } = await import('./registerPwa');
const { pwaUpdateState } = await import('./updateState');

const stubServiceWorker = (): void => {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {},
    configurable: true,
  });
};

describe('registerPwa', () => {
  beforeEach(() => {
    vi.mocked(registerSW).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(navigator, 'serviceWorker');
    pwaUpdateState.set(false);
    pwaUpdateState.setApplyCallback(null);
  });

  it('does not register during development', () => {
    stubServiceWorker();
    registerPwa();
    expect(registerSW).not.toHaveBeenCalled();
  });

  it('does not register when the browser has no service worker support', () => {
    vi.stubEnv('DEV', false);
    registerPwa();
    expect(registerSW).not.toHaveBeenCalled();
  });

  it('registers in production and raises the update signal on need-refresh', () => {
    vi.stubEnv('DEV', false);
    stubServiceWorker();
    const updateSW = vi.fn(async () => {});
    vi.mocked(registerSW).mockReturnValue(updateSW);

    registerPwa();
    expect(registerSW).toHaveBeenCalledTimes(1);
    expect(pwaUpdateState.current()).toBe(false);

    const options = vi.mocked(registerSW).mock.calls[0][0];
    options?.onNeedRefresh?.();
    expect(pwaUpdateState.current()).toBe(true);

    // Applying the update hands control to the plugin's reload-and-activate path.
    pwaUpdateState.applyUpdate();
    expect(updateSW).toHaveBeenCalledWith(true);
  });
});
