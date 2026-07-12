import type { Provider } from '@lexical/yjs';

/**
 * A no-op {@link Provider} satisfying `@lexical/yjs`'s contract for the headless
 * flows (seeding and snapshotting) that run a binding in isolation — no
 * awareness, no network — so every method is inert. Shared so the two flows keep
 * one definition rather than drifting copies.
 */
export const createStubProvider = (): Provider => ({
  awareness: {
    getLocalState: () => null,
    getStates: () => new Map(),
    on: () => undefined,
    off: () => undefined,
    setLocalState: () => undefined,
    setLocalStateField: () => undefined,
  },
  connect: () => undefined,
  disconnect: () => undefined,
  on: () => undefined,
  off: () => undefined,
});
