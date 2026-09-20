import { PairingError, PairingErrorCode } from './pairing.types';

/**
 * The nonce replay cache, specified in `docs/pairing-protocol.md` §14.
 *
 * Device-local, bounded, and never synced. It holds nonces only: a payload
 * captured off a screen must not be presentable twice, and that is the whole
 * job. Retaining device identifiers or timings here would turn a replay defence
 * into a record of who paired when — the trusted-device registry is where
 * durable device facts belong.
 */

export const REPLAY_CACHE_CAPACITY = 256;
export const MAX_CLOCK_SKEW_MILLIS = 60_000;

export interface ReplayCache {
  /**
   * Record a nonce, or throw {@link PairingError} if it has been seen. Insertion
   * happens *before* the payload is acted on, so a duplicate racing the original
   * loses rather than both proceeding.
   */
  admit: (options: { nonce: string; sessionId: string; expiresAt: number }) => void;
  size: () => number;
}

interface Entry {
  sessionId: string;
  expiresAt: number;
}

/**
 * `now` is injected so tests are deterministic and the package keeps no ambient
 * clock dependency — the same treatment the hybrid logical clock gets.
 */
export const createReplayCache = (now: () => number = () => Date.now()): ReplayCache => {
  const entries = new Map<string, Entry>();

  const evictExpired = (at: number): void => {
    for (const [nonce, entry] of entries) {
      if (entry.expiresAt + MAX_CLOCK_SKEW_MILLIS <= at) entries.delete(nonce);
    }
  };

  /**
   * Make room by dropping the entry closest to expiry. Flooding the cache
   * therefore only evicts entries that are about to become unusable anyway, and
   * each flood attempt is a fresh session a user must physically accept.
   */
  const evictEarliest = (): void => {
    let earliestNonce: string | null = null;
    let earliest = Number.POSITIVE_INFINITY;
    for (const [nonce, entry] of entries) {
      if (entry.expiresAt < earliest) {
        earliest = entry.expiresAt;
        earliestNonce = nonce;
      }
    }
    if (earliestNonce !== null) entries.delete(earliestNonce);
  };

  return {
    admit: ({ nonce, sessionId, expiresAt }) => {
      const at = now();
      evictExpired(at);
      if (entries.has(nonce)) {
        throw new PairingError(PairingErrorCode.ReplayedNonce, 'nonce has already been used');
      }
      if (entries.size >= REPLAY_CACHE_CAPACITY) evictEarliest();
      entries.set(nonce, { sessionId, expiresAt });
    },
    size: () => entries.size,
  };
};
