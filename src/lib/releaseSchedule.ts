const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When the next release ships: 3 August 2026, 22:00 CEST (20:00 UTC). The
 * pre-release banner counts down to this moment and disappears once it passes.
 */
export const NEXT_RELEASE_AT = Date.UTC(2026, 7, 3, 20, 0, 0);

/** Human-readable release moment for copy interpolation. */
export const NEXT_RELEASE_LABEL = '3 August, 22:00 CEST';

/**
 * Whole days remaining until the release, rounded up so a partial day still
 * counts (the evening before the release reads "1 day remaining"). Negative
 * once the release moment has passed.
 */
export const daysUntilNextRelease = (now: number): number =>
  Math.ceil((NEXT_RELEASE_AT - now) / DAY_MS);
