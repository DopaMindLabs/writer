import { useSyncExternalStore } from 'react';
import {
  peerLinkStatus,
  type DeviceLinkStates,
} from '@/lib/writerSyncIntegration/peerLinkStatus';

/**
 * Which paired devices this page is connected to, re-rendering the caller on
 * each change, so a device list can say so beside the device it is about.
 *
 * A device this page has never had a link to is absent rather than reported as
 * disconnected: sessions do not survive a reload, so "no entry" is the ordinary
 * resting state and not something to alarm anyone with.
 */
export const usePeerLinkStates = (): DeviceLinkStates =>
  useSyncExternalStore(
    peerLinkStatus.subscribe,
    peerLinkStatus.current,
    peerLinkStatus.current,
  );
