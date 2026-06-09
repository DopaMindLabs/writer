import { describe, it, expect } from 'vitest';
import { countWords } from './wordCount';
import {
  lexicalJsonToPlainText,
  countWords as countPlainTextWords,
} from '@/lib/revisions/lexicalJsonToPlainText';

// A real serialized editor state: one paragraph, "hello" split across three
// text nodes because "ll" is bold. Word boundaries must not be invented at
// text-node boundaries.
const textNode = (text: string, format = 0) => ({
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text,
  type: 'text',
  version: 1,
});

const midWordFormattedBody = JSON.stringify({
  root: {
    children: [
      {
        children: [textNode('he'), textNode('ll', 1), textNode('o')],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
});

describe('countWords', () => {
  it('does not split a word at inline-formatting boundaries', () => {
    expect(countWords(midWordFormattedBody)).toBe(1);
  });

  it('matches the Inspector plaintext count for the same body', () => {
    expect(countWords(midWordFormattedBody)).toBe(
      countPlainTextWords(lexicalJsonToPlainText(midWordFormattedBody)),
    );
  });

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
