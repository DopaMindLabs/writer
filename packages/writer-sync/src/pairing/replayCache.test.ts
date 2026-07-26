import { describe, expect, it } from 'vitest';
import { PairingError, PairingErrorCode } from './pairing.types';
import {
  MAX_CLOCK_SKEW_MILLIS,
  REPLAY_CACHE_CAPACITY,
  createReplayCache,
} from './replayCache';

const START = 1_700_000_000_000;

/** A cache whose clock the test drives, so nothing depends on wall time. */
const cacheAt = (clock: { now: number }) => createReplayCache(() => clock.now);

const entry = (nonce: string, expiresAt: number) => ({
  nonce,
  sessionId: 'session-1',
  expiresAt,
});

describe('createReplayCache', () => {
  it('admits a nonce it has not seen', () => {
    const clock = { now: START };
    const cache = cacheAt(clock);
    expect(() => cache.admit(entry('a', START + 60_000))).not.toThrow();
    expect(cache.size()).toBe(1);
  });

  it('rejects the same nonce twice', () => {
    const clock = { now: START };
    const cache = cacheAt(clock);
    cache.admit(entry('a', START + 60_000));
    try {
      cache.admit(entry('a', START + 60_000));
      expect.unreachable('should have rejected the replay');
    } catch (error) {
      expect(error).toBeInstanceOf(PairingError);
      expect((error as PairingError).code).toBe(PairingErrorCode.ReplayedNonce);
    }
  });

  it('rejects a replay even under a different session id', () => {
    // The nonce is the key; borrowing it for another session is still a replay.
    const clock = { now: START };
    const cache = cacheAt(clock);
    cache.admit({ nonce: 'a', sessionId: 'one', expiresAt: START + 60_000 });
    expect(() =>
      cache.admit({ nonce: 'a', sessionId: 'two', expiresAt: START + 60_000 }),
    ).toThrow(PairingError);
  });

  it('admits distinct nonces', () => {
    const clock = { now: START };
    const cache = cacheAt(clock);
    cache.admit(entry('a', START + 60_000));
    cache.admit(entry('b', START + 60_000));
    expect(cache.size()).toBe(2);
  });
});

describe('expiry', () => {
  it('keeps an entry while its payload could still be considered valid', () => {
    const clock = { now: START };
    const cache = cacheAt(clock);
    cache.admit(entry('a', START + 60_000));
    // Past expiry but inside the skew allowance: still a replay.
    clock.now = START + 60_001;
    expect(() => cache.admit(entry('a', START + 60_000))).toThrow(PairingError);
  });

  it('drops an entry once its payload can no longer be valid anywhere', () => {
    const clock = { now: START };
    const cache = cacheAt(clock);
    cache.admit(entry('a', START + 60_000));
    clock.now = START + 60_000 + MAX_CLOCK_SKEW_MILLIS + 1;
    // Nothing to protect any more — the payload is unusable on any clock.
    expect(() => cache.admit(entry('a', START + 200_000))).not.toThrow();
  });

  it('does not grow without bound as sessions come and go', () => {
    const clock = { now: START };
    const cache = cacheAt(clock);
    for (let i = 0; i < 50; i += 1) {
      cache.admit(entry(`n${String(i)}`, clock.now + 60_000));
      clock.now += 10_000;
    }
    expect(cache.size()).toBeLessThan(50);
  });
});

describe('capacity', () => {
  it('stays within its ceiling under a flood', () => {
    const clock = { now: START };
    const cache = cacheAt(clock);
    for (let i = 0; i < REPLAY_CACHE_CAPACITY * 2; i += 1) {
      cache.admit(entry(`flood-${String(i)}`, START + 60_000));
    }
    expect(cache.size()).toBeLessThanOrEqual(REPLAY_CACHE_CAPACITY);
  });

  it('evicts the entry closest to expiry first', () => {
    const clock = { now: START };
    const cache = cacheAt(clock);
    // The soonest-to-expire entry is the least valuable to keep.
    cache.admit(entry('soonest', START + 1_000));
    for (let i = 0; i < REPLAY_CACHE_CAPACITY; i += 1) {
      cache.admit(entry(`later-${String(i)}`, START + 200_000));
    }
    // `soonest` was displaced, so it is admissible again.
    expect(() => cache.admit(entry('soonest', START + 1_000))).not.toThrow();
    // A longer-lived entry is still remembered. (Not `later-0`: re-admitting
    // above filled the cache again and displaced that one in turn.)
    expect(() => cache.admit(entry('later-200', START + 200_000))).toThrow(PairingError);
  });
});
