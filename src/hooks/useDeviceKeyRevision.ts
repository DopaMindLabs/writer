import { useSyncExternalStore } from 'react';
import {
  getDeviceKeyRevision,
  onDeviceKeyRingChange,
} from '@/lib/cloud/crypto/keyStore';

/**
 * The current device-key-ring revision, re-rendering the caller whenever the
 * ring is acquired, reloaded (including a cross-tab pull), or forgotten. Encrypted
 * live queries fold this into their dependency array so they re-run the instant a
 * key becomes available — the fix for navigation names staying hidden after a
 * keyless first sign-in. The same getter serves client and server snapshots
 * (the revision is a plain module counter with no hydration mismatch).
 */
export const useDeviceKeyRevision = (): number =>
  useSyncExternalStore(onDeviceKeyRingChange, getDeviceKeyRevision, getDeviceKeyRevision);
