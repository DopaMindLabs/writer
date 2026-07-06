import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAnnotator, type AnnotatorCallbacks } from './useAnnotator';
import type { SelectionCapture } from '../core/types';

const capture = (page = 1): SelectionCapture => ({
  page,
  quote: 'a highlighted sentence',
  rects: [{ x: 0.1, y: 0.1, w: 0.2, h: 0.05 }],
});

const callbacks = (): AnnotatorCallbacks => ({
  apply: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
  recolor: vi.fn(async () => undefined),
  setNote: vi.fn(async () => undefined),
});

describe('useAnnotator', () => {
  it('stashes a capture and clears it', () => {
    const { result } = renderHook(() => useAnnotator(callbacks()));
    expect(result.current.capture).toBeNull();

    act(() => {
      result.current.handleCapture(capture());
    });
    expect(result.current.capture?.quote).toBe('a highlighted sentence');

    act(() => {
      result.current.clearCapture();
    });
    expect(result.current.capture).toBeNull();
  });

  it('delegates apply, remove, recolour and set-note to the host callbacks', async () => {
    const cbs = callbacks();
    const { result } = renderHook(() => useAnnotator(cbs));

    await act(async () => {
      await result.current.apply({ capture: capture(), kind: 'highlight', color: 'yellow' });
    });
    expect(cbs.apply).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.recolor('h1', 'green');
      await result.current.setNote('h1', 'my note');
      await result.current.remove('h1');
    });
    expect(cbs.recolor).toHaveBeenCalledWith('h1', 'green');
    expect(cbs.setNote).toHaveBeenCalledWith('h1', 'my note');
    expect(cbs.remove).toHaveBeenCalledWith('h1');
  });
});
