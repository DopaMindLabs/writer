import type { ReactNode } from 'react';
import type { SyncCoordinator } from '@/lib/syncProviders/coordinator';
import { SyncCoordinatorContext } from './syncCoordinatorContext';

export interface WriterSyncProviderProps {
  /** The coordinator boot started, so UI and boot share one set of providers. */
  coordinator: SyncCoordinator;
  children: ReactNode;
}

/** Publishes the sync coordinator to the tree. */
export const WriterSyncProvider = ({ coordinator, children }: WriterSyncProviderProps) => (
  <SyncCoordinatorContext.Provider value={coordinator}>
    {children}
  </SyncCoordinatorContext.Provider>
);
