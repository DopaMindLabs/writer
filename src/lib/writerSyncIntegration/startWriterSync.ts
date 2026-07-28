import type { SyncCoordinator } from 'writer-sync/core';
import { db } from '@/db/db';
import { appLogger } from '@/lib/appLogger';
import { createWriterSyncCoordinator } from './createWriterSyncCoordinator';
import { P2P_PROVIDER_ID } from './writerSyncConfiguration';
import { startFrameIngestion } from './materialization/frameIngestion';
import { startLivePeerSync } from './livePeerSync';
import { writerJournalIdentity } from './materialization/writerJournalDeps';
import { compactJournal } from './materialization/compactJournal';

/**
 * Start durable, session-level sync for every provider that offers it, and return
 * a single teardown for all of them. Providers with only a realtime capability (a
 * peer transport) are not started here — those transports are per-scope /
 * per-document, created on demand, not at boot.
 *
 * Frame ingestion starts alongside the application's default durable provider:
 * frames it replicates into the journal are materialised through the shared
 * inbox path after every settled round.
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
    const durable = coordinator.defaultProvider()?.durableSync;
    if (durable) {
      stops.push(startFrameIngestion({ db, syncComplete: durable.syncComplete }));
    }
    // Catch-up carries what a peer missed when a connection opens; this carries
    // what this device writes while one is already open.
    stops.push(
      startLivePeerSync({
        db,
        coordinator,
        providerId: P2P_PROVIDER_ID,
        deviceId: async () => String((await writerJournalIdentity()).deviceId),
      }),
    );
  } catch (error) {
    teardown();
    throw error;
  }
  // Compaction is best-effort housekeeping after boot has succeeded: a failure
  // to compact must never stop sync from starting, and boot must never wait on a
  // journal scan.
  compactJournal(db).catch((error: unknown) => {
    appLogger.warn('journal compaction failed', error);
  });
  return teardown;
};
