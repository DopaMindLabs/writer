import { describe, expect, it } from 'vitest';
import { compareTimestamps } from 'writer-sync/core';
import { writerClock } from './writerLogicalClock';

describe('writerClock', () => {
  it('is one clock: successive stamps strictly increase', () => {
    const first = writerClock.now();
    const second = writerClock.now();

    expect(compareTimestamps(second, first)).toBeGreaterThan(0);
  });

  it('stamps after a timestamp observed from another device', () => {
    const remote = { millis: Date.now() + 30_000, counter: 2 };

    writerClock.observe(remote);

    expect(compareTimestamps(writerClock.now(), remote)).toBeGreaterThan(0);
  });
});
