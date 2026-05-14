import { act, render, renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeProvider';
import { useUI } from '@/store/ui';

beforeEach(() => {
  act(() => useUI.setState({ theme: 'light' }));
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

  it('toggle flips light ↔ dark', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('light');
    act(() => result.current.toggle());
    expect(useUI.getState().theme).toBe('dark');
    act(() => result.current.toggle());
    expect(useUI.getState().theme).toBe('light');
  });

  it('setTheme directly updates the store', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.setTheme('dark'));
    expect(useUI.getState().theme).toBe('dark');
  });

  it('useTheme throws when used outside a ThemeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(
      /useTheme must be used inside/,
    );
    spy.mockRestore();
  });
});
