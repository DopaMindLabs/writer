/** How durably the browser holds this origin's data (IndexedDB included). */
export type StoragePersistence = 'persistent' | 'best-effort' | 'unsupported';

/** The Storage API surface we touch, as it actually exists at runtime: absent
 *  entirely in some engines, so every member is optional (lib.dom declares it
 *  non-optional, which would make guards look redundant to the type layer). */
interface MaybeStorageManager {
  storage?: {
    persist?: () => Promise<boolean>;
    persisted?: () => Promise<boolean>;
  };
}

const storageManager = (): MaybeStorageManager['storage'] => {
  const nav: MaybeStorageManager = navigator;
  return nav.storage;
};

/**
 * Ask the browser to protect this origin's storage from automatic eviction.
 * Everything the user writes lives in IndexedDB, so eviction is data loss —
 * the request is made once at boot and is a silent no-op where unsupported.
 * Browsers decide on their own signals (installation, engagement); a refusal
 * is not an error.
 */
export const requestPersistentStorage = async (): Promise<boolean> => {
  const persist = storageManager()?.persist;
  if (!persist) return false;
  return persist.call(navigator.storage);
};

/** Report the current persistence state for the settings surface. */
export const queryPersistence = async (): Promise<StoragePersistence> => {
  const persisted = storageManager()?.persisted;
  if (!persisted) return 'unsupported';
  return (await persisted.call(navigator.storage)) ? 'persistent' : 'best-effort';
};
