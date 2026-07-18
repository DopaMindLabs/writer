import { createSyncCoordinator } from '@/lib/syncProviders/coordinator';
import type { WriterSyncOptions } from '@/lib/syncProviders/types';
import { createDexieCloudProvider } from '@/lib/cloud/dexieCloudProvider';

/**
 * The composition root for Writer Sync: the single place that knows both the
 * coordinator and the concrete providers. `@/lib/syncProviders` stays free of
 * any provider implementation, and providers stay unaware of each other.
 *
 * Boot calls this instead of a provider's own entry point, so adding a second
 * provider later is a change here rather than in the boot layer.
 */
const defaultOptions = (): WriterSyncOptions => ({
  providers: [createDexieCloudProvider()],
});

/**
 * Start durable sync for every configured provider that offers it, and return a
 * single teardown for all of them. Providers with no `frameSync` capability
 * (a realtime-only peer transport, say) are not started here — they are
 * per-document, not per-session.
 *
 * A provider that fails to start propagates, so boot surfaces the failure
 * rather than coming up in a half-synced state; providers already started are
 * left for the caller's teardown on the boot error path.
 */
export const startWriterSync = async (
  options: WriterSyncOptions = defaultOptions(),
): Promise<() => void> => {
  const coordinator = createSyncCoordinator(options);
  const stops = await Promise.all(
    coordinator.providersWith('frameSync').map((provider) => provider.frameSync.start()),
  );
  return () => {
    for (const stop of stops) stop();
  };
};
