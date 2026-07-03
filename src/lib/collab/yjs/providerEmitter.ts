type EventHandler = (payload: unknown) => void;

/**
 * A minimal on/off/emit hub for the `@lexical/yjs` Provider events
 * (`sync`/`status`/`update`/`reload`). Kept tiny and untyped-at-the-edge; the
 * provider casts itself to the typed `Provider` contract.
 */
export interface ProviderEmitter {
  readonly on: (type: string, handler: EventHandler) => void;
  readonly off: (type: string, handler: EventHandler) => void;
  readonly emit: (type: string, payload: unknown) => void;
}

export const createProviderEmitter = (): ProviderEmitter => {
  const handlers = new Map<string, Set<EventHandler>>();
  return {
    on: (type, handler) => {
      const set = handlers.get(type) ?? new Set<EventHandler>();
      set.add(handler);
      handlers.set(type, set);
    },
    off: (type, handler) => {
      handlers.get(type)?.delete(handler);
    },
    emit: (type, payload) => {
      handlers.get(type)?.forEach((handler) => {
        handler(payload);
      });
    },
  };
};
