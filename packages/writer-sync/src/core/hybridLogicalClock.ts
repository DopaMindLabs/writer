/**
 * A hybrid logical timestamp: wall-clock milliseconds with a logical counter
 * that disambiguates events sharing one millisecond. It orders mutations for
 * convergence without trusting any single device's clock to be exact.
 *
 * The deterministic tie-breaker *between devices* (equal `millis` and `counter`)
 * is the operation's device id, carried by the operation envelope — not by the
 * timestamp itself, so a timestamp stays provider- and device-neutral. The full
 * receive/merge behaviour lands with the operation protocol (runbook slice 1E);
 * this module provides the local monotonic clock the metadata layer stamps with.
 */
export interface HybridLogicalTimestamp {
  /** Wall clock at the mutation, milliseconds since the epoch. */
  millis: number;
  /** Monotonic counter for events within one millisecond. */
  counter: number;
}

export interface HybridLogicalClock {
  /** The next timestamp, monotonically non-decreasing across calls. */
  now: () => HybridLogicalTimestamp;
}

/** Order two timestamps: negative if `a` precedes `b`, positive if it follows. */
export const compareTimestamps = (
  a: HybridLogicalTimestamp,
  b: HybridLogicalTimestamp,
): number => a.millis - b.millis || a.counter - b.counter;

/**
 * A local monotonic clock. When wall time has not advanced since the last call
 * the counter increments, so successive stamps always compare as strictly later
 * even within one millisecond. `wallClock` is injectable so tests are
 * deterministic and do not depend on the ambient clock.
 */
export const createHybridLogicalClock = (
  wallClock: () => number = () => Date.now(),
): HybridLogicalClock => {
  let last: HybridLogicalTimestamp = { millis: 0, counter: 0 };
  return {
    now: () => {
      const millis = wallClock();
      last =
        millis > last.millis
          ? { millis, counter: 0 }
          : { millis: last.millis, counter: last.counter + 1 };
      return last;
    },
  };
};
