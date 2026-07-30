import { useMemo } from 'react';
import { useCloudObservable } from '@/lib/cloud/cloudObservable';
import { KeyEscrowPresence } from 'writer-sync/core';
import { useDefaultSyncCapability } from './syncCoordinatorContext';

/** Never emits — for when no configured provider delivers keys. */
const NONE = { subscribe: () => ({ unsubscribe: () => undefined }) };

/**
 * Whether the cloud account holds key material this device could adopt, from the
 * application's default key-delivery provider. {@link KeyEscrowPresence.Unknown}
 * when the default delivers no keys (or none is configured), which is also the
 * safe answer: never offer set-up on an unknown.
 */
export const useEscrowPresence = (): KeyEscrowPresence => {
  const keyDelivery = useDefaultSyncCapability('keyDelivery');
  return useCloudObservable(
    useMemo(() => keyDelivery?.escrowPresence ?? NONE, [keyDelivery]),
    KeyEscrowPresence.Unknown,
  );
};
