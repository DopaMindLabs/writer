import { describe, it, expect } from 'vitest';
import { countWords, lexicalJsonToPlainText } from './lexicalJsonToPlainText';

const sampleLexical = {
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Chapter One',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'heading',
        version: 1,
        tag: 'h1',
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'The rain fell sideways.',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
        textFormat: 0,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
};

describe('lexicalJsonToPlainText', () => {
  it('returns empty string for empty input', () => {
    expect(lexicalJsonToPlainText('')).toBe('');
  });

  it('passes plain text through unchanged when not serialized Lexical JSON', () => {
    expect(lexicalJsonToPlainText('Dr. Kirchner walks in.')).toBe(
      'Dr. Kirchner walks in.',
    );
  });

  it('extracts plaintext from serialized Lexical JSON', () => {
    const text = lexicalJsonToPlainText(JSON.stringify(sampleLexical));
    expect(text).toContain('Chapter One');
    expect(text).toContain('The rain fell sideways.');
  });
});

describe('countWords', () => {
  it('returns 0 for empty or whitespace-only text', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n  ')).toBe(0);
  });

  it('counts words separated by any whitespace', () => {
    expect(countWords('one two three')).toBe(3);
    expect(countWords('  spaced \n out\twords ')).toBe(3);
  });
});
