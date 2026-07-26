interface KeylessLockService {
  current: () => boolean;
  set: (value: boolean) => void;
  subscribe: (listener: () => void) => () => void;
}

/** Own the mutable lock flag and its subscribers behind one stable service. */
const createKeylessLockService = (): KeylessLockService => {
  let keyless = false;
  const listeners = new Set<() => void>();
  return {
    current: () => keyless,
    set: (value) => {
      if (value === keyless) return;
      keyless = value;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

/**
 * A tiny synchronous signal for the "signed in, but this device holds no key
 * ring" state. While it is on, the write middleware refuses content mutations on
 * encrypted tables so a signed-in-but-keyless device can never seal plaintext
 * into — or push plaintext through — the sync queue. Mirrors {@link keyMismatchState}
 * in shape (read synchronously by the middleware, subscribable by the UI) and is
 * kept out of any React store so the middleware can poll it without a hook.
 */
export const keylessLockState = createKeylessLockService();
