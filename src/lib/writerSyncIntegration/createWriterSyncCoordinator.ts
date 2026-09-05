import { createSyncCoordinator } from 'writer-sync/core';
import type { SyncCoordinator } from 'writer-sync/core';
import type { SyncConfiguration } from 'writer-sync/core';
import { writerSyncConfiguration } from './writerSyncConfiguration';

/**
 * The composition root for Writer Sync: the single place that knows both the
 * coordinator and Writer's configuration. the engine package stays free of any
 * provider implementation and of Writer's defaults; providers stay unaware of
 * each other.
 *
 * Changing which providers Writer runs, or which is its default, is a change to
 * {@link writerSyncConfiguration} and nowhere else.
 */
export const createWriterSyncCoordinator = (
  configuration: SyncConfiguration = writerSyncConfiguration(),
): SyncCoordinator => createSyncCoordinator(configuration);
