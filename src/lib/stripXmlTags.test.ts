import { describe, expect, it } from 'vitest';
import { stripXmlTags } from './stripXmlTags';

describe('stripXmlTags', () => {
  it('returns text without markup unchanged', () => {
    expect(stripXmlTags('Plain prose.')).toBe('Plain prose.');
  });

  it('removes tags and keeps the text between them', () => {
    expect(stripXmlTags('<p>Hello <b>there</b></p>')).toBe('Hello there');
  });

  it('removes tags whose brackets are interleaved', () => {
    expect(stripXmlTags('<<b>b>bold<</b>/b>')).toBe('b>bold/b>');
  });

  it('leaves no complete tag behind, however deeply nested', () => {
    expect(stripXmlTags('<<<x>x>x>text')).not.toMatch(/<[^>]*>/);
  });

  it('is idempotent — sanitising the result changes nothing', () => {
    const once = stripXmlTags('<a href="#"><<span>>text</span></a>');
    expect(stripXmlTags(once)).toBe(once);
  });

  it('returns an empty string for empty input', () => {
    expect(stripXmlTags('')).toBe('');
  });
});
