import { describe, it, expect, vi } from 'vitest';
import { registerEditorHandle, getEditorHandle } from './editorRegistry';

describe('editorRegistry', () => {
  it('registers a handle and retrieves it by doc id', () => {
    const handle = { restoreBody: vi.fn() };
    const unregister = registerEditorHandle('reg-1', handle);
    expect(getEditorHandle('reg-1')).toBe(handle);
    unregister();
    expect(getEditorHandle('reg-1')).toBeUndefined();
  });

  it('returns undefined for an unregistered doc', () => {
    expect(getEditorHandle('reg-missing')).toBeUndefined();
  });

  it('a stale cleanup does not drop a handle a remount replaced', () => {
    const first = { restoreBody: vi.fn() };
    const second = { restoreBody: vi.fn() };
    const unregisterFirst = registerEditorHandle('reg-2', first);
    const unregisterSecond = registerEditorHandle('reg-2', second);

    unregisterFirst(); // the old mount's cleanup must not evict the live handle
    expect(getEditorHandle('reg-2')).toBe(second);

    unregisterSecond();
    expect(getEditorHandle('reg-2')).toBeUndefined();
  });
});
