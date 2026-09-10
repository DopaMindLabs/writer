import { createHybridLogicalClock, type HybridLogicalClock } from 'writer-sync/core';

/**
 * Writer's single hybrid logical clock.
 *
 * Every logical time this app produces or accepts passes through this one
 * instance: the metadata facade stamps local mutations with it, the operation
 * factory times deletions with it, and the materialiser merges the timestamps
 * of accepted inbound frames into it. A second instance would defeat the merge
 * — the clock that observed a remote reading would not be the clock that stamps
 * the next local edit, so a device behind its peers would keep issuing
 * timestamps that lose every conflict.
 */
export const writerClock: HybridLogicalClock = createHybridLogicalClock();
