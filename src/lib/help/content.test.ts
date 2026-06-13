import { describe, it, expect } from 'vitest';
import {
  getHelpDoc,
  hasHelpDoc,
  listHelpDocSlugs,
  slugify,
} from './content';

describe('help content loader', () => {
  it('extracts the h1 as the title and excludes it from the body', () => {
    const doc = getHelpDoc('getting-started');
    expect(doc?.title).toBe('Getting started');
    expect(doc?.body).not.toContain('# Getting started');
    expect(doc?.body.length).toBeGreaterThan(0);
  });

  it('parses level-2 and level-3 headings with stable anchor ids', () => {
    const doc = getHelpDoc('keyboard-shortcuts');
    expect(doc).toBeDefined();
    const ids = doc!.headings.map((h) => h.id);
    expect(ids).toContain('universal');
    expect(doc!.headings.length).toBeGreaterThan(0);
    expect(doc!.headings.every((h) => h.id.length > 0)).toBe(true);
  });

  it('falls back to English for an unknown locale', () => {
    const en = getHelpDoc('mobile', 'en');
    const fr = getHelpDoc('mobile', 'fr');
    expect(fr).toBeDefined();
    expect(fr?.title).toBe(en?.title);
  });

  it('returns undefined for an unknown slug', () => {
    expect(getHelpDoc('does-not-exist')).toBeUndefined();
    expect(hasHelpDoc('does-not-exist')).toBe(false);
  });

  it('lists all loaded English slugs', () => {
    const slugs = listHelpDocSlugs();
    expect(slugs).toContain('getting-started');
    expect(slugs).toContain('your-data');
  });

  it('slugifies heading text into url-safe anchors', () => {
    expect(slugify('On this page')).toBe('on-this-page');
    expect(slugify('Citations & bibliography!')).toBe('citations-bibliography');
  });

  it('reuses English heading slugs for translated headings (non-Latin script)', () => {
    const en = getHelpDoc('accessibility', 'en');
    const ja = getHelpDoc('accessibility', 'ja');
    expect(en).toBeDefined();
    expect(ja).toBeDefined();
    expect(ja!.headings.length).toBe(en!.headings.length);
    expect(ja!.headings.map((h) => h.id)).toEqual(en!.headings.map((h) => h.id));
    expect(ja!.headings.every((h) => h.id.length > 0)).toBe(true);
    expect(ja!.headings.some((h) => h.text !== en!.headings.find((eh) => eh.id === h.id)?.text)).toBe(true);
  });

  it('reuses English heading slugs for translated headings (Latin script)', () => {
    const en = getHelpDoc('features', 'en');
    const it = getHelpDoc('features', 'it');
    expect(en).toBeDefined();
    expect(it).toBeDefined();
    expect(it!.headings.length).toBe(en!.headings.length);
    expect(it!.headings.map((h) => h.id)).toEqual(en!.headings.map((h) => h.id));
  });
});
