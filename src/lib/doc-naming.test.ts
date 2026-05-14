import { formatDocName } from './doc-naming';

describe('formatDocName', () => {
  // 2024-01-08T14:30:00Z is a Monday.
  const fixed = new Date('2024-01-08T14:30:00Z');

  it('replaces {{date}} with YYYY-MM-DD', () => {
    expect(formatDocName('Note {{date}}', fixed)).toBe('Note 2024-01-08');
  });

  it('replaces {{datetime}} with YYYY-MM-DD HH:MM', () => {
    expect(formatDocName('At {{datetime}}', fixed)).toBe('At 2024-01-08 14:30');
  });

  it('replaces {{day}} with weekday name', () => {
    expect(formatDocName('{{day}}', fixed)).toBe('Monday');
  });

  it('returns the pattern unchanged when no placeholders match', () => {
    expect(formatDocName('Untitled', fixed)).toBe('Untitled');
  });

  it('replaces multiple placeholders in one call', () => {
    expect(formatDocName('{{day}} · {{date}}', fixed)).toBe(
      'Monday · 2024-01-08',
    );
  });

  it('uses current date when no Date is passed', () => {
    expect(formatDocName('plain')).toBe('plain');
  });
});
