import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import { useInlineRename } from './useInlineRename';

const keyEvent = (
  key: string,
): {
  event: KeyboardEvent<HTMLInputElement>;
  blur: () => void;
  preventDefault: () => void;
} => {
  const blur = vi.fn();
  const preventDefault = vi.fn();
  const event = {
    key,
    preventDefault,
    target: { blur },
  } as unknown as KeyboardEvent<HTMLInputElement>;
  return { event, blur, preventDefault };
};

describe('useInlineRename', () => {
  it('starts idle with the draft seeded from the current name', () => {
    const save = vi.fn<(next: string) => Promise<void>>();
    const { result } = renderHook(() => useInlineRename('Chapter 1', save));
    expect(result.current.editing).toBe(false);
    expect(result.current.draft).toBe('Chapter 1');
  });

  it('enters edit mode on beginEdit', () => {
    const save = vi.fn<(next: string) => Promise<void>>();
    const { result } = renderHook(() => useInlineRename('Chapter 1', save));
    act(() => {
      result.current.beginEdit();
    });
    expect(result.current.editing).toBe(true);
  });

  it('saves the trimmed draft and leaves edit mode on commit', async () => {
    const save = vi.fn<(next: string) => Promise<void>>().mockResolvedValue();
    const { result } = renderHook(() => useInlineRename('Chapter 1', save));
    act(() => {
      result.current.beginEdit();
    });
    act(() => {
      result.current.setDraft('  Chapter 2  ');
    });
    await act(async () => {
      await result.current.commit();
    });
    expect(save).toHaveBeenCalledWith('Chapter 2');
    expect(result.current.editing).toBe(false);
  });

  it('does not save when the draft is unchanged', async () => {
    const save = vi.fn<(next: string) => Promise<void>>().mockResolvedValue();
    const { result } = renderHook(() => useInlineRename('Chapter 1', save));
    await act(async () => {
      await result.current.commit();
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('does not save when the draft is blank', async () => {
    const save = vi.fn<(next: string) => Promise<void>>().mockResolvedValue();
    const { result } = renderHook(() => useInlineRename('Chapter 1', save));
    act(() => {
      result.current.setDraft('   ');
    });
    await act(async () => {
      await result.current.commit();
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('resyncs the draft when the name changes while idle', () => {
    const save = vi.fn<(next: string) => Promise<void>>();
    const { result, rerender } = renderHook(
      ({ current }) => useInlineRename(current, save),
      { initialProps: { current: 'Old' } },
    );
    rerender({ current: 'New' });
    expect(result.current.draft).toBe('New');
  });

  it('keeps the in-progress draft when the name changes while editing', () => {
    const save = vi.fn<(next: string) => Promise<void>>();
    const { result, rerender } = renderHook(
      ({ current }) => useInlineRename(current, save),
      { initialProps: { current: 'Old' } },
    );
    act(() => {
      result.current.beginEdit();
    });
    act(() => {
      result.current.setDraft('typing');
    });
    rerender({ current: 'Changed' });
    expect(result.current.draft).toBe('typing');
  });

  it('blurs the field on Enter to trigger the commit path', () => {
    const save = vi.fn<(next: string) => Promise<void>>();
    const { result } = renderHook(() => useInlineRename('Chapter 1', save));
    const { event, blur, preventDefault } = keyEvent('Enter');
    act(() => {
      result.current.onKeyDown(event);
    });
    expect(blur).toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalled();
  });

  it('cancels back to the current name on Escape', () => {
    const save = vi.fn<(next: string) => Promise<void>>();
    const { result } = renderHook(() => useInlineRename('Chapter 1', save));
    act(() => {
      result.current.beginEdit();
    });
    act(() => {
      result.current.setDraft('scratch');
    });
    const { event, preventDefault } = keyEvent('Escape');
    act(() => {
      result.current.onKeyDown(event);
    });
    expect(result.current.draft).toBe('Chapter 1');
    expect(result.current.editing).toBe(false);
    expect(preventDefault).toHaveBeenCalled();
  });
});
