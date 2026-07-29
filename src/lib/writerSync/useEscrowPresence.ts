import { useMemo } from 'react';
import { useCloudObservable } from '@/lib/cloud/cloudObservable';
import { KeyEscrowPresence } from '@/lib/syncProviders/types';
import { useSyncCapability } from './syncCoordinatorContext';

/** Never emits — for when no configured provider delivers keys. */
const NONE = { subscribe: () => ({ unsubscribe: () => undefined }) };

/**
 * Whether the account holds key material this device could adopt, from the first
 * provider that delivers keys. {@link KeyEscrowPresence.Unknown} when none does,
 * which is also the safe answer: never offer set-up on an unknown.
 */
export const useEscrowPresence = (): KeyEscrowPresence => {
  const keyDelivery = useSyncCapability('keyDelivery');
  return useCloudObservable(
    useMemo(() => keyDelivery?.escrowPresence ?? NONE, [keyDelivery]),
    KeyEscrowPresence.Unknown,
  );
};
