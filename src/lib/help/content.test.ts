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
    expect(ids).toContain('global');
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
});
