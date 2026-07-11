import { renderHook } from '@/test/test-utils';
import { useCoarsePointer } from './useCoarsePointer';

const realMatchMedia = window.matchMedia;

const setPointer = (coarse: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: coarse && query.includes('pointer: coarse'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
};

describe('useCoarsePointer', () => {
  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  it('is true for a coarse pointer', () => {
    setPointer(true);
    const { result } = renderHook(() => useCoarsePointer());
    expect(result.current).toBe(true);
  });

  it('is false for a fine pointer', () => {
    setPointer(false);
    const { result } = renderHook(() => useCoarsePointer());
    expect(result.current).toBe(false);
  });
});
