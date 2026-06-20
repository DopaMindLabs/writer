import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUI } from '@/store/ui';
import { useEffectiveEditorTypography } from './useEffectiveEditorTypography';

beforeEach(() => {
  window.localStorage.clear();
  act(() => {
    useUI.setState({ editorFont: 'serif', editorSize: 'base' });
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
});
