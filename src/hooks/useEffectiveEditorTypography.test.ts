import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUI } from '@/store/ui';
import { useA11y } from '@/store/a11y';
import { DEFAULT_A11Y_PREFS } from '@/theme/a11y-prefs';
import { useEffectiveEditorTypography } from './useEffectiveEditorTypography';

beforeEach(() => {
  window.localStorage.clear();
  act(() => {
    useUI.setState({
      editorFont: 'serif',
      editorSize: 'base',
      editorSizeFollowsA11y: true,
    });
    useA11y.setState({ ...DEFAULT_A11Y_PREFS });
  });
});

describe('useEffectiveEditorTypography', () => {
  it('returns the universal default when no doc is supplied', () => {
    const { result } = renderHook(() => useEffectiveEditorTypography());
    expect(result.current.font).toBe('serif');
    expect(result.current.size).toBe('base');
    expect(result.current.fontIsOverridden).toBe(false);
    expect(result.current.sizeIsOverridden).toBe(false);
  });

  it('returns the universal default when the doc has no overrides', () => {
    const { result } = renderHook(() => useEffectiveEditorTypography({}));
    expect(result.current.font).toBe('serif');
    expect(result.current.size).toBe('base');
    expect(result.current.fontIsOverridden).toBe(false);
    expect(result.current.sizeIsOverridden).toBe(false);
  });

  it('returns the per-doc override when set', () => {
    const { result } = renderHook(() =>
      useEffectiveEditorTypography({ editorFont: 'sans', editorSize: 'lg' }),
    );
    expect(result.current.font).toBe('sans');
    expect(result.current.size).toBe('lg');
    expect(result.current.fontIsOverridden).toBe(true);
    expect(result.current.sizeIsOverridden).toBe(true);
  });

  it('mixes per-doc font with default size', () => {
    const { result } = renderHook(() =>
      useEffectiveEditorTypography({ editorFont: 'mono' }),
    );
    expect(result.current.font).toBe('mono');
    expect(result.current.size).toBe('base');
    expect(result.current.fontIsOverridden).toBe(true);
    expect(result.current.sizeIsOverridden).toBe(false);
  });

  it('reflects the universal default when the doc value is cleared', () => {
    act(() => {
      useUI.setState({ editorFont: 'sans', editorSize: 'xl' });
    });
    const { result } = renderHook(() => useEffectiveEditorTypography({}));
    expect(result.current.font).toBe('sans');
    expect(result.current.size).toBe('xl');
  });

  it('sanitizes invalid per-doc overrides back to the universal default', () => {
    const { result } = renderHook(() =>
      useEffectiveEditorTypography({
        editorFont: 'invalid' as unknown as 'serif',
        editorSize: 'massive' as unknown as 'base',
      }),
    );
    expect(result.current.font).toBe('serif');
    expect(result.current.size).toBe('base');
  });

  it('returns sizeScale equal to editorSizeScale when a11y is at base default', () => {
    const { result } = renderHook(() => useEffectiveEditorTypography());
    expect(result.current.sizeScale).toBe(1);
    expect(result.current.followA11y).toBe(true);
  });

  it('composes the editor size with the a11y text-scale when followA11y is on', () => {
    act(() => {
      useUI.setState({ editorSize: 'lg' });
      useA11y.setState({ textScale: 'xl' });
    });
    const { result } = renderHook(() => useEffectiveEditorTypography());
    expect(result.current.size).toBe('lg');
    expect(result.current.sizeScale).toBeCloseTo(1.12 * 1.24, 5);
    expect(result.current.followA11y).toBe(true);
  });

  it('ignores a11y text-scale when followA11y is off', () => {
    act(() => {
      useUI.setState({ editorSize: 'lg', editorSizeFollowsA11y: false });
      useA11y.setState({ textScale: 'xl' });
    });
    const { result } = renderHook(() => useEffectiveEditorTypography());
    expect(result.current.size).toBe('lg');
    expect(result.current.sizeScale).toBe(1.12);
    expect(result.current.followA11y).toBe(false);
  });

  it('composes per-doc size override with the a11y text-scale', () => {
    act(() => {
      useA11y.setState({ textScale: 'lg' });
    });
    const { result } = renderHook(() =>
      useEffectiveEditorTypography({ editorSize: 'sm' }),
    );
    expect(result.current.size).toBe('sm');
    expect(result.current.sizeScale).toBeCloseTo(0.9 * 1.12, 5);
  });
});
