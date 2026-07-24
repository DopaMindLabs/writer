import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Space } from '@/db/schema';
import { useTopTemplateMap } from './useTopTemplateMap';

const spaceWithTemplate = (template: string): Space => ({
  id: 's1',
  tag: 'TST',
  name: 'Test Space',
  shared: false,
  template,
  createdAt: 0,
  updatedAt: 0,
});

describe('useTopTemplateMap', () => {
  it('maps each top-level template section by its label', () => {
    const { result } = renderHook(() =>
      useTopTemplateMap(spaceWithTemplate('journal')),
    );
    expect([...result.current.keys()]).toEqual([
      'Daily',
      'Themes',
      'Seedlings',
      'Streak',
    ]);
    expect(result.current.get('Daily')?.defaultDocName).toBe('{{date}}');
    expect(result.current.get('Streak')?.defaultDocName).toBe('');
  });

  it('returns an empty map when no space is provided', () => {
    const { result } = renderHook(() => useTopTemplateMap(undefined));
    expect(result.current.size).toBe(0);
  });

  it('returns an empty map for an unknown template id', () => {
    const { result } = renderHook(() =>
      useTopTemplateMap(spaceWithTemplate('does-not-exist')),
    );
    expect(result.current.size).toBe(0);
  });

  it('memoises the map across renders of the same template', () => {
    const space = spaceWithTemplate('journal');
    const { result, rerender } = renderHook(() => useTopTemplateMap(space));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
