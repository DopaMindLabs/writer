import { useSyncExternalStore } from 'react';
import {
  currentLockReason,
  subscribeLockReason,
  type LockReason,
} from '@/lib/cloud/crypto/lockReason';

/**
 * Reactively track why content writes to encrypted tables are refused — a key
 * mismatch, a signed-in-keyless device, or `'none'`. Lets a surface block or warn
 * before a write is attempted, sharing the middleware's precedence.
 */
export const useCloudLockReason = (): LockReason =>
  useSyncExternalStore(subscribeLockReason, currentLockReason);
