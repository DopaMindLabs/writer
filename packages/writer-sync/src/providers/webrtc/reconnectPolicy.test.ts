import { describe, expect, it } from 'vitest';
import { createReconnectPolicy } from './reconnectPolicy';

/** No jitter, so the growth curve itself is under test. */
const plain = (overrides = {}) =>
  createReconnectPolicy({ jitterRatio: 0, random: () => 0, ...overrides });

describe('createReconnectPolicy', () => {
  it('grows exponentially from the initial delay', () => {
    const policy = plain({ initialDelayMillis: 100, maxDelayMillis: 10_000 });
    expect([1, 2, 3, 4].map((n) => policy.delayFor(n))).toEqual([100, 200, 400, 800]);
  });

  it('never exceeds the ceiling', () => {
    const policy = plain({ initialDelayMillis: 100, maxDelayMillis: 500 });
    expect([1, 2, 3, 4, 5].map((n) => policy.delayFor(n))).toEqual([100, 200, 400, 500, 500]);
  });

  it('gives up after the attempt limit', () => {
    const policy = plain({ maxAttempts: 3 });
    expect(policy.delayFor(3)).not.toBeNull();
    expect(policy.delayFor(4)).toBeNull();
  });

  it('rejects a nonsensical attempt number', () => {
    expect(plain().delayFor(0)).toBeNull();
    expect(plain().delayFor(-1)).toBeNull();
  });

  it('stays finite at high attempt numbers', () => {
    // 2 ** 1024 is Infinity, and Infinity * 0 is NaN — a delay of NaN would
    // sleep forever rather than not at all.
    const policy = plain({ maxAttempts: 2000, initialDelayMillis: 100, maxDelayMillis: 30_000 });
    const late = policy.delayFor(1500);
    expect(Number.isFinite(late)).toBe(true);
    expect(late).toBe(30_000);
  });
});

describe('jitter', () => {
  it('shaves off at most the configured fraction', () => {
    const full = createReconnectPolicy({
      initialDelayMillis: 1000,
      jitterRatio: 0.25,
      random: () => 1,
    });
    expect(full.delayFor(1)).toBe(750);
  });

  it('leaves the delay untouched when the draw is zero', () => {
    const none = createReconnectPolicy({
      initialDelayMillis: 1000,
      jitterRatio: 0.25,
      random: () => 0,
    });
    expect(none.delayFor(1)).toBe(1000);
  });

  it('separates two devices that failed on the same tick', () => {
    // Without jitter both retry in lockstep forever.
    const a = createReconnectPolicy({ initialDelayMillis: 1000, random: () => 0.1 });
    const b = createReconnectPolicy({ initialDelayMillis: 1000, random: () => 0.9 });
    expect(a.delayFor(1)).not.toBe(b.delayFor(1));
  });

  it('never produces a negative delay', () => {
    const policy = createReconnectPolicy({
      initialDelayMillis: 1000,
      jitterRatio: 1,
      random: () => 1,
    });
    expect(policy.delayFor(1)).toBe(0);
  });
});
