import { describe, it, expect } from 'vitest';
import { formatJoinedAt, formatLastSeen } from './deviceTimestamps';

const NOW = new Date('2026-03-12T10:00:00Z').getTime();
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatJoinedAt', () => {
  it('names the day, without the noise of a clock time', () => {
    expect(formatJoinedAt(NOW, 'en-GB')).toBe('12 March 2026');
  });

  it('reads bare "en" as British English, the language this app writes', () => {
    // Intl resolves a bare `en` to US conventions ("March 12, 2026"), and i18next
    // carries the language as `en` — so the region has to be pinned, or the dates
    // silently contradict every other string on the page.
    expect(formatJoinedAt(NOW, 'en')).toBe('12 March 2026');
  });
});

describe('formatLastSeen', () => {
  it('reads as "just now" under a minute', () => {
    expect(formatLastSeen(NOW - 5000, NOW, 'en-GB')).toBe('this minute');
  });

  it('counts in whole minutes, hours and days', () => {
    expect(formatLastSeen(NOW - 5 * MINUTE, NOW, 'en-GB')).toBe('5 minutes ago');
    expect(formatLastSeen(NOW - 3 * HOUR, NOW, 'en-GB')).toBe('3 hours ago');
    expect(formatLastSeen(NOW - 2 * DAY, NOW, 'en-GB')).toBe('2 days ago');
  });

  it('does not read a fast clock as the future', () => {
    // A device whose clock runs a little ahead stamps lastSeenAt after our now.
    // "in 30 seconds" would be nonsense for a device that just checked in.
    expect(formatLastSeen(NOW + 30_000, NOW, 'en-GB')).toBe('this minute');
  });
});
