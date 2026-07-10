import { act, render, renderHook } from '@testing-library/react';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from './theme-context';
import { useUI } from '@/store/ui';

beforeEach(() => {
  act(() => { useUI.setState({ theme: 'light' }); });
});

describe('ThemeProvider', () => {
  it('sets data-theme on documentElement', () => {
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('setTheme to hc-light applies data-theme attribute', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => { result.current.setTheme('hc-light'); });
    expect(useUI.getState().theme).toBe('hc-light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('hc-light');

    act(() => { result.current.setTheme('hc-dark'); });
    expect(document.documentElement.getAttribute('data-theme')).toBe('hc-dark');
  });

  it('setTheme directly updates the store', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => { result.current.setTheme('dark'); });
    expect(useUI.getState().theme).toBe('dark');
  });

  it('useTheme throws when used outside a ThemeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(
      /useTheme must be used inside/,
    );
    spy.mockRestore();
  });

  it('detects high-contrast dark mode from media queries on mount', () => {
    window.localStorage.clear();
    const matchSpy = vi
      .spyOn(window, 'matchMedia')
      .mockImplementation((q: string) =>
        ({
          matches:
            q === '(prefers-contrast: more)' ||
            q === '(prefers-color-scheme: dark)',
          media: q,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
          onchange: null,
        }),
      );
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    );
    expect(useUI.getState().theme).toBe('hc-dark');
    matchSpy.mockRestore();
  });

  it('detects high-contrast light mode when prefers-contrast is more and color scheme is light', () => {
    window.localStorage.clear();
    const matchSpy = vi
      .spyOn(window, 'matchMedia')
      .mockImplementation((q: string) =>
        ({
          matches: q === '(prefers-contrast: more)',
          media: q,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
          onchange: null,
        }),
      );
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    );
    expect(useUI.getState().theme).toBe('hc-light');
    matchSpy.mockRestore();
  });

  it('ignores persisted localStorage with no theme field (handles bad JSON gracefully)', () => {
    window.localStorage.setItem('lorem-ui', '{not-json');
    const matchSpy = vi
      .spyOn(window, 'matchMedia')
      .mockImplementation(
        () =>
          ({
            matches: false,
            media: '',
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
            onchange: null,
          }),
      );
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    );
    expect(useUI.getState().theme).toBe('light');
    matchSpy.mockRestore();
  });
});
