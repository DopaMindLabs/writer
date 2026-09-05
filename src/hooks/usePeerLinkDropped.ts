import { useSyncExternalStore } from 'react';
import { peerLinkStatus } from '@/lib/writerSyncIntegration/peerLinkStatus';

/**
 * Whether a link that *was* working has been lost during this page's life.
 *
 * Deliberately narrower than "nothing is connected". A device that has never
 * connected — a fresh start, a reload, a pairing that never came up — is the
 * resting state and says nothing worth interrupting anyone about; only losing a
 * link that was carrying work is news.
 */
export const usePeerLinkDropped = (): boolean =>
  useSyncExternalStore(
    peerLinkStatus.subscribe,
    peerLinkStatus.dropped,
    peerLinkStatus.dropped,
  );
