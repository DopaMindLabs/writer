import { describe, it, expect } from 'vitest';
import { lexicalJsonToOutline } from './outline';

const textNode = (text: string) => ({
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text,
  type: 'text',
  version: 1,
});

const heading = (tag: string, children: object[]) => ({
  children,
  direction: 'ltr',
  format: '',
  indent: 0,
  type: 'heading',
  version: 1,
  tag,
});

const paragraph = (text: string) => ({
  children: text ? [textNode(text)] : [],
  direction: 'ltr',
  format: '',
  indent: 0,
  type: 'paragraph',
  version: 1,
});

const body = (children: object[]): string =>
  JSON.stringify({
    root: {
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  });

describe('lexicalJsonToOutline', () => {
  it('returns an empty outline for an empty body', () => {
    expect(lexicalJsonToOutline('')).toEqual([]);
  });

  it('returns an empty outline when the document has no headings', () => {
    expect(
      lexicalJsonToOutline(body([paragraph('Just prose.'), paragraph('More.')])),
    ).toEqual([]);
  });

  it('extracts headings with their levels, in document order', () => {
    const out = lexicalJsonToOutline(
      body([
        heading('h1', [textNode('The tower')]),
        paragraph('Morning prose between headings.'),
        heading('h2', [textNode('Mira walks')]),
        heading('h3', [textNode('Counting')]),
        paragraph(''),
        heading('h2', [textNode('The bell')]),
      ]),
    );
    expect(out).toEqual([
      { level: 1, text: 'The tower' },
      { level: 2, text: 'Mira walks' },
      { level: 3, text: 'Counting' },
      { level: 2, text: 'The bell' },
    ]);
  });

  it('maps every heading tag h1–h6 to its numeric level', () => {
    const out = lexicalJsonToOutline(
      body(
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((tag) =>
          heading(tag, [textNode(tag.toUpperCase())]),
        ),
      ),
    );
    expect(out.map((e) => e.level)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('concatenates a heading made of several inline text nodes', () => {
    const out = lexicalJsonToOutline(
      body([
        heading('h2', [
          textNode('The '),
          { ...textNode('last'), format: 1 },
          textNode(' morning'),
        ]),
      ]),
    );
    expect(out).toEqual([{ level: 2, text: 'The last morning' }]);
  });

  it('trims heading text and skips headings that are empty', () => {
    const out = lexicalJsonToOutline(
      body([
        heading('h1', [textNode('  Padded  ')]),
        heading('h2', []),
        heading('h2', [textNode('   ')]),
      ]),
    );
    expect(out).toEqual([{ level: 1, text: 'Padded' }]);
  });

  it('throws on a body that is not serialized Lexical JSON', () => {
    expect(() => lexicalJsonToOutline('A plain-text body.')).toThrow();
  });
});
