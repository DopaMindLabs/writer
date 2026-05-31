import { describe, it, expect } from 'vitest';
import i18n from '@/i18n';
import type { Revision } from '@/db/schema';
import {
  formatRevisionAge,
  formatRevisionSubtitle,
} from './revisionDisplay';

const t = i18n.getFixedT('en', 'chrome');

const makeRevision = (overrides: Partial<Revision>): Revision => ({
  id: 'r',
  docId: 'd1',
  body: 'b',
  text: 'b',
  wordCount: 1,
  kind: overrides.kind ?? 'auto',
  createdAt: 0,
  ...overrides,
});

describe('formatRevisionAge', () => {
  const now = 10_000_000_000;

  it('shows "now" for very recent revisions', () => {
    expect(formatRevisionAge(now - 1_000, t, now)).toBe(
      t('inspector.history.ageNow'),
    );
  });

  it('shows minutes, hours, and days for older revisions', () => {
    expect(formatRevisionAge(now - 5 * 60_000, t, now)).toBe(
      t('inspector.history.ageMinutes', { count: 5 }),
    );
    expect(formatRevisionAge(now - 3 * 3_600_000, t, now)).toBe(
      t('inspector.history.ageHours', { count: 3 }),
    );
    expect(formatRevisionAge(now - 2 * 86_400_000, t, now)).toBe(
      t('inspector.history.ageDays', { count: 2 }),
    );
  });
});

describe('formatRevisionSubtitle', () => {
  it('uses the user label when present', () => {
    expect(
      formatRevisionSubtitle(makeRevision({ label: 'first draft' }), t),
    ).toBe('first draft');
  });

  it('falls back to the translated kind when there is no label', () => {
    expect(formatRevisionSubtitle(makeRevision({ kind: 'baseline' }), t)).toBe(
      t('inspector.history.kind.baseline'),
    );
  });
});
