/**
 * A hybrid logical timestamp: wall-clock milliseconds with a logical counter
 * that disambiguates events sharing one millisecond. It orders mutations for
 * convergence without trusting any single device's clock to be exact.
 *
 * The deterministic tie-breaker *between devices* (equal `millis` and `counter`)
 * is the operation's device id, carried by the operation envelope — not by the
 * timestamp itself, so a timestamp stays provider- and device-neutral.
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
  /**
   * Merge a timestamp received from another device, so the next {@link now}
   * stamps strictly after it. Without this a device whose wall clock lags keeps
   * issuing timestamps below the ones it has already accepted, and its own
   * edits lose every conflict until the clock catches up.
   */
  observe: (remote: HybridLogicalTimestamp) => void;
}

/**
 * How far ahead of the local wall clock a received timestamp may be and still
 * be merged. A frame's logical time is authenticated but not *trusted*: a peer
 * with a broken (or hostile) clock could otherwise push this device's clock
 * years forward, and every later local edit would inherit that reading.
 */
export const MAX_OBSERVED_DRIFT_MILLIS = 5 * 60 * 1000;

/** Order two timestamps: negative if `a` precedes `b`, positive if it follows. */
export const compareTimestamps = (
  a: HybridLogicalTimestamp,
  b: HybridLogicalTimestamp,
): number => a.millis - b.millis || a.counter - b.counter;

/**
 * A monotonic clock that also merges the timestamps it receives. When wall time
 * has not advanced since the last stamp the counter increments, so successive
 * stamps always compare as strictly later even within one millisecond; an
 * observed remote timestamp raises the reading the same way, which is what
 * keeps two devices converging when their wall clocks disagree. `wallClock` is
 * injectable so tests are deterministic and do not depend on the ambient clock.
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
    observe: (remote) => {
      if (remote.millis - wallClock() > MAX_OBSERVED_DRIFT_MILLIS) return;
      if (compareTimestamps(remote, last) > 0) last = remote;
    },
  };
};
