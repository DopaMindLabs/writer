import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import { formatBytes, formatRelativeTime, intervalLabel } from './syncFormat';

// Minimal TFunction stand-in: echoes the key, applying {{count}}/{{label}}.
const t = ((key: string, opts?: Record<string, unknown>) => {
  if (opts && 'count' in opts) return `${String(opts.count)} min`;
  if (opts && 'label' in opts) return String(opts.label);
  return key;
}) as unknown as TFunction;

describe('syncFormat', () => {
  it('formatBytes scales across units', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 kB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('formatRelativeTime buckets by elapsed time', () => {
    const now = 10_000_000_000;
    expect(formatRelativeTime(now, t, now)).toBe('settings.sync.justNow');
    expect(formatRelativeTime(now - 5 * 60_000, t, now)).toBe('5 min ago');
    expect(formatRelativeTime(now - 3 * 3_600_000, t, now)).toBe('3 h ago');
    expect(formatRelativeTime(now - 2 * 86_400_000, t, now)).toBe('2 d ago');
    // Older than a week → ISO date.
    expect(formatRelativeTime(now - 30 * 86_400_000, t, now)).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  it('intervalLabel reflects off vs minutes', () => {
    expect(intervalLabel(0, t)).toBe('settings.sync.intervalOff');
    expect(intervalLabel(10, t)).toBe('10 min');
  });
});
