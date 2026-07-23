import type { SyncCoordinator } from '@/lib/syncProviders/coordinator';
import { createWriterSyncCoordinator } from './createWriterSyncCoordinator';

/**
 * Start durable, session-level sync for every provider that offers it, and return
 * a single teardown for all of them. Providers with only a realtime capability (a
 * peer transport) are not started here — those transports are per-scope /
 * per-document, created on demand, not at boot.
 *
 * Providers start in sequence so a failure can be unwound deterministically: if
 * one fails to start, every provider already started is torn down before the
 * failure propagates, so boot never comes up half-synced.
 */
export const startWriterSync = async (
  coordinator: SyncCoordinator = createWriterSyncCoordinator(),
): Promise<() => void> => {
  const stops: (() => void)[] = [];
  const teardown = () => {
    // Unwind in reverse so teardown mirrors start order.
    for (const stop of [...stops].reverse()) stop();
  };
  try {
    for (const provider of coordinator.providersWith('durableSync')) {
      stops.push(await provider.durableSync.start());
    }
  } catch (error) {
    teardown();
    throw error;
  }
  return teardown;
};
