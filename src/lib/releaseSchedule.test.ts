import { describe, it, expect } from 'vitest';
import { NEXT_RELEASE_AT, daysUntilNextRelease } from './releaseSchedule';

describe('releaseSchedule', () => {
  it('pins the release moment to 23 August 2026, 22:00 CEST (20:00 UTC)', () => {
    expect(new Date(NEXT_RELEASE_AT).toISOString()).toBe('2026-08-23T20:00:00.000Z');
  });

  it('rounds a partial day up so the evening before reads one day remaining', () => {
    const twoHoursBefore = NEXT_RELEASE_AT - 2 * 60 * 60 * 1000;
    expect(daysUntilNextRelease(twoHoursBefore)).toBe(1);
  });

  it('counts whole days remaining ahead of the release', () => {
    const tenDaysBefore = NEXT_RELEASE_AT - 10 * 24 * 60 * 60 * 1000;
    expect(daysUntilNextRelease(tenDaysBefore)).toBe(10);
  });

  it('does not report remaining days once the release has passed', () => {
    const dayAfter = NEXT_RELEASE_AT + 24 * 60 * 60 * 1000;
    expect(daysUntilNextRelease(dayAfter)).toBeLessThanOrEqual(0);
  });
});
