import { describe, it, expect } from 'vitest';
import {
  countCharacters,
  countWords,
  lexicalJsonToPlainText,
} from './lexicalJsonToPlainText';

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

  it('throws on a body that is not serialized Lexical JSON', () => {
    // Doc bodies are only ever '' or serializeState output.
    expect(() => lexicalJsonToPlainText('Dr. Kirchner walks in.')).toThrow();
  });

  it('extracts plaintext from serialized Lexical JSON', () => {
    const text = lexicalJsonToPlainText(JSON.stringify(sampleLexical));
    expect(text).toContain('Chapter One');
    expect(text).toContain('The rain fell sideways.');
  });

  it('throws when the body is serialized-shaped but not parseable Lexical', () => {
    // Body satisfies isSerialized (has a .root) but the root is the wrong
    // shape, so parseEditorState rejects via the editor's onError hook.
    expect(() =>
      lexicalJsonToPlainText('{"root":{"type":"not-a-real-node"}}'),
    ).toThrow();
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

describe('countCharacters', () => {
  it('returns 0 for empty text', () => {
    expect(countCharacters('')).toBe(0);
  });

  it('counts every character including whitespace', () => {
    expect(countCharacters('abc')).toBe(3);
    expect(countCharacters('a b')).toBe(3);
  });

  it('counts a surrogate-pair emoji as a single code point', () => {
    expect(countCharacters('🙂')).toBe(1);
    expect(countCharacters('a🙂b')).toBe(3);
  });
});
