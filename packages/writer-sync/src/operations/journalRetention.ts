import type { OperationId } from '../core/ids';
import type { EncryptedSyncFrame } from './operation.types';

/**
 * The journal retention policy: operations are kept for a bounded window and a
 * peer that falls behind it resynchronises from current state, never from
 * replayed history.
 *
 * This module owns the **window** half of the policy only. Waiting for every
 * device to confirm receipt cannot be the whole rule — one lost device would
 * hold the journal open forever, and a paired device that never returns is an
 * expected fate, not an edge case — so the window is the backstop that always
 * applies. The window is user-configurable; thirty days is the default.
 *
 * The acknowledgement half, which lets a frame every trusted peer already holds
 * go early, lives in `journalCompaction.ts` and composes the cutoff computed
 * here. Callers wanting the complete rule should use `compactableOperationIds`
 * rather than `expiredOperationIds`.
 *
 * Deletion tombstones are deliberately *not* covered by this policy. They are
 * what stops a device returning from beyond the window resurrecting an entity
 * it still holds a copy of, so they must outlive the frames that produced them;
 * `releasableTombstones` retires them on unanimous acknowledgement alone.
 */

export const JOURNAL_RETENTION_DEFAULT_DAYS = 30;
export const MILLIS_PER_DAY = 86_400_000;

export interface RetentionOptions {
  /** The window in whole days. Must be a positive, finite number. */
  retentionDays: number;
  /** Wall clock, milliseconds since the epoch. Injected — never read ambiently. */
  now: number;
}

/** The instant before which an operation has aged out of the journal. */
export const retentionCutoff = (options: RetentionOptions): number => {
  const { retentionDays, now } = options;
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    throw new RangeError('journal retention: the window must be a positive number of days');
  }
  return now - retentionDays * MILLIS_PER_DAY;
};

/**
 * The operations that have aged out, judged by each frame's logical wall time —
 * the stamp convergence already trusts — so pruning agrees with ordering about
 * what "older" means.
 */
export const expiredOperationIds = (
  frames: readonly EncryptedSyncFrame[],
  options: RetentionOptions,
): OperationId[] => {
  const cutoff = retentionCutoff(options);
  return frames
    .filter((frame) => frame.logicalAt.millis <= cutoff)
    .map((frame) => frame.operationId);
};

/**
 * Whether a peer must rebuild from current state rather than catch up from the
 * journal. True when it was last seen beyond the window — or never seen at all,
 * which is what a freshly paired device is.
 */
export const requiresFullExchange = (
  lastSeenMillis: number | undefined,
  options: RetentionOptions,
): boolean =>
  lastSeenMillis === undefined || lastSeenMillis <= retentionCutoff(options);
