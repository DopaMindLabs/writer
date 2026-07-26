/**
 * Reconnection backoff, specified in runbook §22.
 *
 * Bounded exponential growth with jitter. The jitter is not decoration: two
 * devices that lost a connection at the same instant will otherwise retry in
 * lockstep forever, and a fleet of tabs reconnecting on the same tick is a
 * self-inflicted flood (threat model §5.13).
 *
 * `random` is injected so the schedule is deterministic under test — the policy
 * is pure arithmetic and deserves to be checked as such.
 */

export interface ReconnectPolicyOptions {
  initialDelayMillis?: number;
  maxDelayMillis?: number;
  /** Attempts before the policy gives up and asks the caller to surface it. */
  maxAttempts?: number;
  /** Fraction of the delay that may be shaved off at random, 0–1. */
  jitterRatio?: number;
  random?: () => number;
}

export interface ReconnectPolicy {
  /** Delay before attempt `attempt` (1-based), or `null` when exhausted. */
  delayFor: (attempt: number) => number | null;
  maxAttempts: number;
}

const DEFAULTS = {
  initialDelayMillis: 500,
  maxDelayMillis: 30_000,
  maxAttempts: 8,
  jitterRatio: 0.25,
};

export const createReconnectPolicy = (
  options: ReconnectPolicyOptions = {},
): ReconnectPolicy => {
  const initial = options.initialDelayMillis ?? DEFAULTS.initialDelayMillis;
  const max = options.maxDelayMillis ?? DEFAULTS.maxDelayMillis;
  const maxAttempts = options.maxAttempts ?? DEFAULTS.maxAttempts;
  const jitterRatio = options.jitterRatio ?? DEFAULTS.jitterRatio;
  const random = options.random ?? Math.random;

  return {
    maxAttempts,
    delayFor: (attempt) => {
      if (attempt < 1 || attempt > maxAttempts) return null;
      // Cap the exponent before the multiply: 2 ** 1024 is Infinity, and
      // Infinity * 0 is NaN, which would sleep forever rather than not at all.
      const growth = Math.min(2 ** (attempt - 1), max / initial);
      const base = Math.min(initial * growth, max);
      return Math.round(base - base * jitterRatio * random());
    },
  };
};
