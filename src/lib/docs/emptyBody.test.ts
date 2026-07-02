import { describe, it, expect } from 'vitest';
import { EMPTY_LEXICAL_JSON } from './emptyBody';
import { isSerialized } from '@/editor/serialize';
import { isParseableBody, lexicalJsonToPlainText } from '@/lib/revisions/lexicalJsonToPlainText';
import { countWords } from '@/editor/wordCount';

describe('EMPTY_LEXICAL_JSON', () => {
  it('is recognised as serialized Lexical JSON', () => {
    expect(isSerialized(EMPTY_LEXICAL_JSON)).toBe(true);
  });

  it('parses as a valid Lexical body', () => {
    expect(isParseableBody(EMPTY_LEXICAL_JSON)).toBe(true);
  });

  it('holds no text and counts zero words', () => {
    expect(lexicalJsonToPlainText(EMPTY_LEXICAL_JSON)).toBe('');
    expect(countWords(EMPTY_LEXICAL_JSON)).toBe(0);
  });
});
