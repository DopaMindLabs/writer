import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import type { Section } from '@/db/schema';

const { createSectionMock } = vi.hoisted(() => ({
  createSectionMock: vi.fn<typeof import('@/lib/sections').createSection>(),
}));
vi.mock('@/lib/sections', () => ({ createSection: createSectionMock }));

import { useAddSection } from './useAddSection';

const section = (
  id: string,
  order: number,
  parentSectionId: string | null = null,
): Section => ({ id, spaceId: 's1', parentSectionId, label: id, order });

const keyEvent = (key: string): KeyboardEvent<HTMLInputElement> =>
  ({ key, preventDefault: vi.fn() }) as unknown as KeyboardEvent<HTMLInputElement>;

describe('useAddSection', () => {
  beforeEach(() => {
    createSectionMock.mockReset().mockResolvedValue('new-section');
  });

  it('is idle with an empty value initially', () => {
    const { result } = renderHook(() => useAddSection('s1', []));
    expect(result.current.adding).toBe(false);
    expect(result.current.value).toBe('');
  });

  it('opens the input on start and tracks its value', () => {
    const { result } = renderHook(() => useAddSection('s1', []));
    act(() => {
      result.current.onStart();
    });
    expect(result.current.adding).toBe(true);
    act(() => {
      result.current.onChange('Appendix');
    });
    expect(result.current.value).toBe('Appendix');
  });

  it('creates a section after the last top-level order and resets', async () => {
    const sections = [
      section('a', 0),
      section('b', 2),
      section('sub', 5, 'a'),
    ];
    const { result } = renderHook(() => useAddSection('s1', sections));
    act(() => {
      result.current.onStart();
    });
    act(() => {
      result.current.onChange('Appendix');
    });
    await act(async () => {
      result.current.onKeyDown(keyEvent('Enter'));
    });
    expect(createSectionMock).toHaveBeenCalledWith('s1', 'Appendix', 3);
    expect(result.current.adding).toBe(false);
    expect(result.current.value).toBe('');
  });

  it('uses order zero when there are no top-level sections', async () => {
    const { result } = renderHook(() =>
      useAddSection('s1', [section('sub', 5, 'a')]),
    );
    act(() => {
      result.current.onChange('First');
    });
    await act(async () => {
      await result.current.onBlur();
    });
    expect(createSectionMock).toHaveBeenCalledWith('s1', 'First', 0);
  });

  it('does not create a section for a blank value', async () => {
    const { result } = renderHook(() => useAddSection('s1', []));
    act(() => {
      result.current.onStart();
    });
    act(() => {
      result.current.onChange('   ');
    });
    await act(async () => {
      result.current.onKeyDown(keyEvent('Enter'));
    });
    expect(createSectionMock).not.toHaveBeenCalled();
    expect(result.current.adding).toBe(false);
  });

  it('cancels without creating on Escape', () => {
    const { result } = renderHook(() => useAddSection('s1', []));
    act(() => {
      result.current.onStart();
    });
    act(() => {
      result.current.onChange('Discarded');
    });
    act(() => {
      result.current.onKeyDown(keyEvent('Escape'));
    });
    expect(createSectionMock).not.toHaveBeenCalled();
    expect(result.current.adding).toBe(false);
    expect(result.current.value).toBe('');
  });
});
