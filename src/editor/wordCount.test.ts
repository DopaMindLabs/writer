import { describe, it, expect } from 'vitest';
import { countWords } from './wordCount';

describe('countWords', () => {
  it('counts words in a Lexical JSON tree, walking nested children', () => {
    const body = JSON.stringify({
      root: {
        children: [
          {
            children: [{ text: 'one two' }, { text: ' three four five' }],
          },
        ],
      },
    });
    expect(countWords(body)).toBe(5);
  });

  it('reads text directly off a root with no children', () => {
    const body = JSON.stringify({ root: { text: 'just root text' } });
    expect(countWords(body)).toBe(3);
  });

  it('returns 0 for a Lexical root with neither text nor children', () => {
    const body = JSON.stringify({ root: { type: 'unknown' } });
    expect(countWords(body)).toBe(0);
  });

  it('returns 0 for an empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for a whitespace-only body', () => {
    expect(countWords('   \n  \t  ')).toBe(0);
  });

  it('falls back to plain-text counting when the body is not JSON', () => {
    expect(countWords('plain words here today')).toBe(4);
  });

  it('falls back to plain-text counting when JSON has no root field', () => {
    // '{"foo":"bar"}' splits on whitespace into a single token.
    expect(countWords('{"foo":"bar"}')).toBe(1);
  });
});
