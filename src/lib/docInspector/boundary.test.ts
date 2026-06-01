import { describe, it, expect } from 'vitest';
import { computeLimitBoundary, type TextSegment } from './boundary';

const node = (text: string, key: string): TextSegment => ({ text, nodeKey: key });
const sep = (): TextSegment => ({ text: '\n\n', nodeKey: null });

describe('computeLimitBoundary', () => {
  it('returns null for empty input', () => {
    expect(computeLimitBoundary([], { charLimit: 5 })).toBeNull();
    expect(computeLimitBoundary([node('', 'a')], { charLimit: 5 })).toBeNull();
  });

  it('returns null when no active limit is set', () => {
    expect(computeLimitBoundary([node('hello world', 'a')], {})).toBeNull();
    expect(
      computeLimitBoundary([node('hello', 'a')], { wordLimit: 0, charLimit: 0 }),
    ).toBeNull();
  });

  describe('character limit', () => {
    it('marks the first character beyond the limit', () => {
      expect(
        computeLimitBoundary([node('hello world', 'a')], { charLimit: 5 }),
      ).toEqual({ nodeKey: 'a', offset: 5 });
    });

    it('returns null when exactly at the limit', () => {
      expect(
        computeLimitBoundary([node('hello', 'a')], { charLimit: 5 }),
      ).toBeNull();
    });

    it('counts a surrogate pair as one code point but reports a UTF-16 offset', () => {
      // code points: a, b, 🙂, c, d → limit 3 lands at 'c', UTF-16 index 4
      expect(
        computeLimitBoundary([node('ab🙂cd', 'a')], { charLimit: 3 }),
      ).toEqual({ nodeKey: 'a', offset: 4 });
    });

    it('crosses into the correct node when text spans multiple nodes', () => {
      const segments = [node('Hello ', 'a'), node('world', 'b')];
      // "Hello world", 8th char (index 8) is inside node b (starts at 6)
      expect(computeLimitBoundary(segments, { charLimit: 8 })).toEqual({
        nodeKey: 'b',
        offset: 2,
      });
    });
  });

  describe('word limit', () => {
    it('marks the position just after the last allowed word', () => {
      expect(
        computeLimitBoundary([node('one two three four', 'a')], {
          wordLimit: 2,
        }),
      ).toEqual({ nodeKey: 'a', offset: 7 });
    });

    it('returns null when exactly at the word limit', () => {
      expect(
        computeLimitBoundary([node('one two', 'a')], { wordLimit: 2 }),
      ).toBeNull();
    });
  });

  describe('combined limits', () => {
    it('uses whichever boundary comes first', () => {
      const segments = [node('aaaa bbbb cccc', 'a')];
      // word boundary after "aaaa" = 4; char boundary after 6 chars = 6 → 4 wins
      expect(
        computeLimitBoundary(segments, { wordLimit: 1, charLimit: 6 }),
      ).toEqual({ nodeKey: 'a', offset: 4 });
    });
  });

  describe('block separators', () => {
    it('snaps a boundary that lands in a separator to the next text node', () => {
      const segments = [node('aa', 'a'), sep(), node('bb', 'b')];
      // "aa\n\nbb": char limit 3 → index 3 is inside the separator → next node
      expect(computeLimitBoundary(segments, { charLimit: 3 })).toEqual({
        nodeKey: 'b',
        offset: 0,
      });
    });

    it('counts words across separated blocks', () => {
      const segments = [node('one two', 'a'), sep(), node('three four', 'b')];
      // words: one two three four; after 3rd word "three" → inside node b
      expect(computeLimitBoundary(segments, { wordLimit: 3 })).toEqual({
        nodeKey: 'b',
        offset: 5,
      });
    });
  });
});
