import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

type Listener = (e: MediaQueryListEvent) => void;

const installMatchMedia = (initialMatches: boolean) => {
  const listeners = new Set<Listener>();
  let matches = initialMatches;
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        get matches() {
          return matches;
        },
        media: query,
        onchange: null,
        addEventListener: (_: string, cb: Listener) => listeners.add(cb),
        removeEventListener: (_: string, cb: Listener) => listeners.delete(cb),
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
  return {
    fire: (next: boolean) => {
      matches = next;
      listeners.forEach((cb) => {
        cb({ matches: next } as MediaQueryListEvent);
      });
    },
    listeners,
  };
};

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the initial match state', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(orientation: portrait)'));
    expect(result.current).toBe(true);
  });

  it('updates when the media query starts or stops matching', () => {
    const mql = installMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(orientation: portrait)'));
    expect(result.current).toBe(false);
    act(() => {
      mql.fire(true);
    });
    expect(result.current).toBe(true);
    act(() => {
      mql.fire(false);
    });
    expect(result.current).toBe(false);
  });

  it('unsubscribes on unmount', () => {
    const mql = installMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(orientation: portrait)'));
    expect(mql.listeners.size).toBe(1);
    unmount();
    expect(mql.listeners.size).toBe(0);
  });
});
