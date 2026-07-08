import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useA11y } from './a11y';
import { DEFAULT_A11Y_PREFS } from '@/theme/a11y-prefs';

beforeEach(() => {
  localStorage.clear();
  useA11y.setState({ ...DEFAULT_A11Y_PREFS });
});

describe('useA11y store', () => {
  it('starts at the default (current-behaviour) preferences', () => {
    expect(useA11y.getState().motion).toBe('auto');
    expect(useA11y.getState().textScale).toBe('base');
    expect(useA11y.getState().lineSpacing).toBe('normal');
    expect(useA11y.getState().linkUnderline).toBe('auto');
    expect(useA11y.getState().focusRing).toBe('standard');
  });

  it('persists a changed preference under its own key', () => {
    useA11y.getState().setTextScale('lg');
    expect(useA11y.getState().textScale).toBe('lg');
    const raw = localStorage.getItem('lorem-a11y');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? '{}').textScale).toBe('lg');
  });

  it('does not touch the existing lorem-ui payload', () => {
    localStorage.setItem('lorem-ui', JSON.stringify({ theme: 'dark' }));
    useA11y.getState().setMotion('reduced');
    expect(JSON.parse(localStorage.getItem('lorem-ui') ?? '{}').theme).toBe(
      'dark',
    );
  });

  it('resets every preference back to the default', () => {
    useA11y.getState().setFocusRing('enhanced');
    useA11y.getState().setLineSpacing('loose');
    useA11y.getState().reset();
    expect(useA11y.getState().focusRing).toBe('standard');
    expect(useA11y.getState().lineSpacing).toBe('normal');
  });

  it('persists changes for every individual setter', () => {
    useA11y.getState().setMotion('reduced');
    useA11y.getState().setLineSpacing('loose');
    useA11y.getState().setLinkUnderline('always');
    useA11y.getState().setFocusRing('enhanced');
    const raw = JSON.parse(localStorage.getItem('lorem-a11y') ?? '{}') as Record<
      string,
      string
    >;
    expect(raw.motion).toBe('reduced');
    expect(raw.lineSpacing).toBe('loose');
    expect(raw.linkUnderline).toBe('always');
    expect(raw.focusRing).toBe('enhanced');
  });

  it('swallows persist failures so a quota error does not crash the setter', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota');
      });
    try {
      expect(() => useA11y.getState().setMotion('reduced')).not.toThrow();
      expect(useA11y.getState().motion).toBe('reduced');
    } finally {
      spy.mockRestore();
    }
  });
});
