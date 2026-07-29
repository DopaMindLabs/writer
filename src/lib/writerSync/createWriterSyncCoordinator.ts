import { createSyncCoordinator } from '@/lib/syncProviders/coordinator';
import type { SyncCoordinator } from '@/lib/syncProviders/coordinator';
import type { WriterSyncOptions } from '@/lib/syncProviders/types';
import { createDexieCloudProvider } from '@/lib/cloud/dexieCloudProvider';

/**
 * The composition root for Writer Sync: the single place that knows both the
 * coordinator and the concrete providers. `@/lib/syncProviders` stays free of
 * any provider implementation, and providers stay unaware of each other.
 *
 * Adding a second provider — a peer transport, a local folder — is a change
 * here and nowhere else.
 */
export const createWriterSyncCoordinator = (
  options: WriterSyncOptions = { providers: [createDexieCloudProvider()] },
): SyncCoordinator => createSyncCoordinator(options);
