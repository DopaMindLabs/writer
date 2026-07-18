import type { SyncCoordinator } from '@/lib/syncProviders/coordinator';
import { createWriterSyncCoordinator } from './createWriterSyncCoordinator';

/**
 * Start durable sync for every provider the coordinator holds that offers it,
 * and return a single teardown for all of them. Providers with no `frameSync`
 * capability (a realtime peer transport, say) are not started here — they are
 * per-document, not per-session.
 *
 * A provider that fails to start propagates, so boot surfaces the failure
 * rather than coming up in a half-synced state.
 */
export const startWriterSync = async (
  coordinator: SyncCoordinator = createWriterSyncCoordinator(),
): Promise<() => void> => {
  const stops = await Promise.all(
    coordinator.providersWith('frameSync').map((provider) => provider.frameSync.start()),
  );
  return () => {
    for (const stop of stops) stop();
  };
};
