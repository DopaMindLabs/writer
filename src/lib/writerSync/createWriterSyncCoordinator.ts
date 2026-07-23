import { createSyncCoordinator } from '@/lib/syncProviders/coordinator';
import type { SyncCoordinator } from '@/lib/syncProviders/coordinator';
import type { SyncConfiguration } from '@/lib/syncProviders/types';
import { writerSyncConfiguration } from './writerSyncConfiguration';

/**
 * The composition root for Writer Sync: the single place that knows both the
 * coordinator and Writer's configuration. `@/lib/syncProviders` stays free of any
 * provider implementation and of Writer's defaults; providers stay unaware of
 * each other.
 *
 * Changing which providers Writer runs, or which is its default, is a change to
 * {@link writerSyncConfiguration} and nowhere else.
 */
export const createWriterSyncCoordinator = (
  configuration: SyncConfiguration = writerSyncConfiguration(),
): SyncCoordinator => createSyncCoordinator(configuration);
