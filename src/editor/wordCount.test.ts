import { describe, it, expect } from 'vitest';
import { countWords } from './wordCount';
import {
  lexicalJsonToPlainText,
  countWords as countPlainTextWords,
} from '@/lib/revisions/lexicalJsonToPlainText';
import { serializedBody } from '@/test/fixtures';

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
  it('counts words in a serialized Lexical body', () => {
    expect(countWords(serializedBody('one two three four five'))).toBe(5);
  });

  it('counts words across paragraphs', () => {
    expect(countWords(serializedBody('one two\nthree'))).toBe(3);
  });

  it('does not split a word at inline-formatting boundaries', () => {
    expect(countWords(midWordFormattedBody)).toBe(1);
  });

  it('matches the Inspector plaintext count for the same body', () => {
    expect(countWords(midWordFormattedBody)).toBe(
      countPlainTextWords(lexicalJsonToPlainText(midWordFormattedBody)),
    );
  });

  it('returns 0 for an empty body (fresh doc)', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for a body with only empty paragraphs', () => {
    expect(countWords(serializedBody('\n'))).toBe(0);
  });

  it('throws on a body that is not serialized Lexical JSON', () => {
    // Doc bodies are only ever '' or serializeState output; anything else is
    // corrupt and must fail loudly instead of being miscounted.
    expect(() => countWords('plain words here today')).toThrow();
  });
});
