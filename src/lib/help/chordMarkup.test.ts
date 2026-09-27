import { describe, it, expect } from 'vitest';
import { chordOf, formatChordSpans } from './chordMarkup';

const APPLE = { platform: 'MacIntel' };
const LINUX = { platform: 'Linux x86_64' };

describe('chordOf', () => {
  it('reads the chord a chord span names', () => {
    expect(chordOf('kbd:mod+\\')).toBe('mod+\\');
  });

  it('leaves ordinary code and an empty chord alone', () => {
    expect(chordOf('mod+k')).toBeNull();
    expect(chordOf('kbd:')).toBeNull();
  });
});

describe('formatChordSpans', () => {
  it('formats every chord span for the platform and keeps the rest of the text', () => {
    const body = 'Press `kbd:mod+k`, then `kbd:mod+\\`; `code` stays.';
    expect(formatChordSpans(body, LINUX)).toBe('Press Ctrl+K, then Ctrl+\\; `code` stays.');
    expect(formatChordSpans(body, APPLE)).toBe('Press ⌘K, then ⌘\\; `code` stays.');
  });
});
