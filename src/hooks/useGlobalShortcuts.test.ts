import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useGlobalShortcuts } from './useGlobalShortcuts';
import { useHelp } from '@/store/help';

const press = (key: string, mods: KeyboardEventInit = {}): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { key, cancelable: true, ...mods });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
};

describe('useGlobalShortcuts', () => {
  beforeEach(() => {
    useHelp.setState({ open: false });
  });

  it('opens help on ⌘K and prevents the browser default', () => {
    renderHook(() => useGlobalShortcuts());
    const event = press('k', { metaKey: true });
    expect(useHelp.getState().open).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it('opens help on Ctrl+K (Windows/Linux)', () => {
    renderHook(() => useGlobalShortcuts());
    press('k', { ctrlKey: true });
    expect(useHelp.getState().open).toBe(true);
  });

  it('toggles help closed when pressed again', () => {
    renderHook(() => useGlobalShortcuts());
    press('k', { metaKey: true });
    press('k', { metaKey: true });
    expect(useHelp.getState().open).toBe(false);
  });

  it('responds to ⌘? as well', () => {
    renderHook(() => useGlobalShortcuts());
    press('?', { metaKey: true });
    expect(useHelp.getState().open).toBe(true);
  });

  it('ignores the key without a modifier', () => {
    renderHook(() => useGlobalShortcuts());
    const event = press('k');
    expect(useHelp.getState().open).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it('removes its listener on unmount', () => {
    const { unmount } = renderHook(() => useGlobalShortcuts());
    unmount();
    press('k', { metaKey: true });
    expect(useHelp.getState().open).toBe(false);
  });
});
