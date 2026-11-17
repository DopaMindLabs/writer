import { useEffect, useState, type ReactNode } from 'react';
import type { SyncCoordinator } from 'writer-sync/core';
import { db } from '@/db/db';
import { SyncCoordinatorContext } from './syncCoordinatorContext';
import { createPeerCatchUp, type PeerCatchUp } from './peerCatchUp';
import { PeerCatchUpContext } from './peerCatchUpContext';

export interface WriterSyncProviderProps {
  /** The coordinator boot started, so UI and boot share one set of providers. */
  coordinator: SyncCoordinator;
  /** Injected in tests and stories; defaults to the real wiring. */
  peerCatchUp?: PeerCatchUp;
  children: ReactNode;
}

/**
 * Publishes the sync coordinator to the tree, and the peer catch-up alongside it.
 *
 * Catch-up is created here rather than in the pairing dialog because it has to
 * outlive it: a connection handed to something that unmounts on dismissal would
 * be closed the moment the user acknowledged that pairing had succeeded.
 */
export const WriterSyncProvider = ({
  coordinator,
  peerCatchUp,
  children,
}: WriterSyncProviderProps) => {
  const [catchUp] = useState<PeerCatchUp>(() => peerCatchUp ?? createPeerCatchUp(db));

  useEffect(
    () => () => {
      catchUp.stop();
    },
    [catchUp],
  );

  return (
    <SyncCoordinatorContext.Provider value={coordinator}>
      <PeerCatchUpContext.Provider value={catchUp}>{children}</PeerCatchUpContext.Provider>
    </SyncCoordinatorContext.Provider>
  );
};
