import { afterEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { useFocusOnMount } from './useFocusOnMount';

const mountInput = (value: string): HTMLInputElement => {
  const input = document.createElement('input');
  input.value = value;
  document.body.append(input);
  return input;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('useFocusOnMount', () => {
  it('focuses the target and places the caret at the end when active', () => {
    const input = mountInput('hello');
    const ref: RefObject<HTMLInputElement | null> = { current: input };

    renderHook(() => useFocusOnMount(true, ref));

    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(5);
    expect(input.selectionEnd).toBe(5);
  });

  it('leaves focus untouched when inactive', () => {
    const input = mountInput('hello');
    const ref: RefObject<HTMLInputElement | null> = { current: input };

    renderHook(() => useFocusOnMount(false, ref));

    expect(document.activeElement).not.toBe(input);
  });

  it('focuses once it becomes active on a later render', () => {
    const input = mountInput('draft');
    const ref: RefObject<HTMLInputElement | null> = { current: input };
    const { rerender } = renderHook(
      ({ active }) => useFocusOnMount(active, ref),
      { initialProps: { active: false } },
    );

    expect(document.activeElement).not.toBe(input);
    rerender({ active: true });
    expect(document.activeElement).toBe(input);
  });

  it('does nothing when the ref has no target', () => {
    const ref: RefObject<HTMLInputElement | null> = { current: null };
    expect(() => {
      renderHook(() => useFocusOnMount(true, ref));
    }).not.toThrow();
  });
});
