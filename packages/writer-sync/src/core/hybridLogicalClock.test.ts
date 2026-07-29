import { describe, expect, it } from 'vitest';
import {
  MAX_OBSERVED_DRIFT_MILLIS,
  compareTimestamps,
  createHybridLogicalClock,
} from './hybridLogicalClock';

describe('createHybridLogicalClock', () => {
  it('advances the counter when wall time does not move', () => {
    const clock = createHybridLogicalClock(() => 1000);

    const first = clock.now();
    const second = clock.now();

    expect(first).toEqual({ millis: 1000, counter: 0 });
    expect(second).toEqual({ millis: 1000, counter: 1 });
  });

  it('resets the counter when wall time advances', () => {
    let wall = 1000;
    const clock = createHybridLogicalClock(() => wall);

    clock.now();
    clock.now();
    wall = 1001;
    const third = clock.now();

    expect(third).toEqual({ millis: 1001, counter: 0 });
  });

  it('never goes backwards when wall time regresses', () => {
    let wall = 2000;
    const clock = createHybridLogicalClock(() => wall);

    const forward = clock.now();
    wall = 1500;
    const afterRegression = clock.now();

    expect(compareTimestamps(afterRegression, forward)).toBeGreaterThan(0);
    expect(afterRegression.millis).toBe(2000);
  });

  it('produces strictly increasing timestamps across many calls in one ms', () => {
    const clock = createHybridLogicalClock(() => 42);

    const stamps = Array.from({ length: 5 }, () => clock.now());

    for (let i = 1; i < stamps.length; i += 1) {
      expect(compareTimestamps(stamps[i], stamps[i - 1])).toBeGreaterThan(0);
    }
  });
});

describe('observe', () => {
  it('stamps later than a received timestamp from a device running ahead', () => {
    const clock = createHybridLogicalClock(() => 1000);

    clock.observe({ millis: 1200, counter: 3 });
    const next = clock.now();

    expect(compareTimestamps(next, { millis: 1200, counter: 3 })).toBeGreaterThan(0);
    expect(next).toEqual({ millis: 1200, counter: 4 });
  });

  it('keeps the local reading when the received timestamp is behind', () => {
    const clock = createHybridLogicalClock(() => 2000);

    const local = clock.now();
    clock.observe({ millis: 500, counter: 0 });
    const next = clock.now();

    expect(compareTimestamps(next, local)).toBeGreaterThan(0);
    expect(next.millis).toBe(2000);
  });

  it('lets wall time overtake an observed timestamp again', () => {
    let wall = 1000;
    const clock = createHybridLogicalClock(() => wall);

    clock.observe({ millis: 1200, counter: 7 });
    wall = 1300;
    const next = clock.now();

    expect(next).toEqual({ millis: 1300, counter: 0 });
  });

  it('ignores a timestamp implausibly far ahead of the local wall clock', () => {
    const clock = createHybridLogicalClock(() => 1000);

    clock.observe({ millis: 1000 + MAX_OBSERVED_DRIFT_MILLIS + 1, counter: 0 });
    const next = clock.now();

    expect(next).toEqual({ millis: 1000, counter: 0 });
  });

  it('accepts a timestamp at the edge of the tolerated drift', () => {
    const clock = createHybridLogicalClock(() => 1000);

    clock.observe({ millis: 1000 + MAX_OBSERVED_DRIFT_MILLIS, counter: 0 });
    const next = clock.now();

    expect(next).toEqual({ millis: 1000 + MAX_OBSERVED_DRIFT_MILLIS, counter: 1 });
  });
});

describe('compareTimestamps', () => {
  it('orders by millis first, then counter', () => {
    expect(compareTimestamps({ millis: 1, counter: 9 }, { millis: 2, counter: 0 })).toBeLessThan(0);
    expect(compareTimestamps({ millis: 2, counter: 0 }, { millis: 2, counter: 1 })).toBeLessThan(0);
    expect(compareTimestamps({ millis: 2, counter: 1 }, { millis: 2, counter: 1 })).toBe(0);
  });
});
