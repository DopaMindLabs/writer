import { afterEach, describe, it, expect, vi } from 'vitest';
import * as platform from '@/lib/shortcuts/platform';
import { searchHelp } from './search';

describe('searchHelp', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows shortcuts in excerpts as the keys the reader presses', () => {
    vi.spyOn(platform, 'isApplePlatform').mockReturnValue(false);
    const result = searchHelp('toggle focus mode').find(
      ({ slug }) => slug === 'keyboard-shortcuts',
    );
    expect(result?.excerpt).toContain('Ctrl+\\');
    expect(result?.excerpt).not.toContain('kbd:');
  });

  it('returns nothing for an empty query', () => {
    expect(searchHelp('')).toEqual([]);
    expect(searchHelp('   ')).toEqual([]);
  });

  it('returns nothing when no article matches', () => {
    expect(searchHelp('zzzznotaword')).toEqual([]);
  });

  it('finds the citations article by keyword', () => {
    const results = searchHelp('bibtex');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].slug).toBe('citations-and-bibliography');
  });

  it('ranks a title match above a mere body mention', () => {
    const results = searchHelp('shortcuts');
    expect(results[0].slug).toBe('keyboard-shortcuts');
  });

  it('includes an excerpt around the match', () => {
    const results = searchHelp('backup');
    expect(results[0].slug).toBe('your-data');
    expect(results[0].excerpt.toLowerCase()).toContain('backup');
  });

  it('requires all tokens to match (AND semantics)', () => {
    const matched = searchHelp('keyboard shortcuts');
    expect(matched.some((r) => r.slug === 'keyboard-shortcuts')).toBe(true);
    expect(searchHelp('keyboard zzzznope')).toEqual([]);
  });
});
