import type { SyncConfiguration } from '@/lib/syncProviders/types';
import { createDexieCloudProvider } from '@/lib/cloud/dexieCloudProvider';

/**
 * Writer's own sync configuration — the single place Writer names its providers
 * and defaults. The reusable engine chooses nothing; the application does.
 *
 * Stage 1 configures Dexie Cloud as the one provider and the default, preserving
 * today's behaviour. Stage 2A adds a QR-paired P2P provider and moves the default
 * to it — a change here and nowhere in the engine.
 */
export const writerSyncConfiguration = (): SyncConfiguration => {
  const dexieCloud = createDexieCloudProvider();
  return {
    providers: [dexieCloud],
    bindings: [],
    defaultProviderInstanceId: dexieCloud.id,
    pairingMethods: [],
  };
};
