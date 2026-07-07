import { describe, it, expect } from 'vitest';
import { formatAnnotationTimestamp } from './annotationTimestamp';

// Tests run with TZ=UTC, so these are deterministic.
const now = new Date('2026-07-07T15:00:00Z');

describe('formatAnnotationTimestamp', () => {
  it('formats a same-day time in en-GB (24-hour)', () => {
    const at = new Date('2026-07-07T14:04:00Z').getTime();
    expect(formatAnnotationTimestamp(at, false, now)).toBe('14:04');
  });

  it('formats the previous calendar day as YESTERDAY', () => {
    const at = new Date('2026-07-06T09:00:00Z').getTime();
    expect(formatAnnotationTimestamp(at, false, now)).toBe('YESTERDAY');
  });

  it('formats an older annotation as a short date', () => {
    const at = new Date('2026-06-24T09:00:00Z').getTime();
    expect(formatAnnotationTimestamp(at, false, now)).toBe('24 JUN');
  });

  it('appends · NOTE when the annotation has a note', () => {
    const at = new Date('2026-07-07T14:04:00Z').getTime();
    expect(formatAnnotationTimestamp(at, true, now)).toBe('14:04 · NOTE');
  });
});
