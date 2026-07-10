import { describe, it, expect } from 'vitest';
import { lexicalJsonToMarkdown } from './lexicalToMarkdown';

const sampleLexical = {
  root: {
    children: [
      {
        children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: 'Chapter One', type: 'text', version: 1 }],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'heading',
        version: 1,
        tag: 'h1',
      },
      {
        children: [
          { detail: 0, format: 0, mode: 'normal', style: '', text: 'The rain ', type: 'text', version: 1 },
          { detail: 0, format: 2, mode: 'normal', style: '', text: 'fell sideways', type: 'text', version: 1 },
          { detail: 0, format: 0, mode: 'normal', style: '', text: '.', type: 'text', version: 1 },
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

describe('lexicalJsonToMarkdown', () => {
  it('returns empty string for empty input', () => {
    expect(lexicalJsonToMarkdown('')).toBe('');
  });

  it('throws on a body that is not serialized Lexical JSON', () => {
    expect(() => lexicalJsonToMarkdown('Dr. Kirchner walks in.')).toThrow();
  });

  it('converts a Lexical heading + paragraph to markdown', () => {
    const md = lexicalJsonToMarkdown(JSON.stringify(sampleLexical));
    expect(md).toContain('# Chapter One');
    expect(md).toContain('The rain *fell sideways*.');
  });
});
