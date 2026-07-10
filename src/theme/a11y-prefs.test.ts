import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyA11yPrefs,
  DEFAULT_A11Y_PREFS,
  prefersReducedMotion,
  sanitizeA11yPrefs,
} from './a11y-prefs';

const A11Y_ATTRS = [
  'data-motion',
  'data-text-scale',
  'data-line-spacing',
  'data-link-underline',
  'data-focus',
];

const removeA11yAttrs = () => {
  for (const attr of A11Y_ATTRS) {
    document.documentElement.removeAttribute(attr);
  }
};

afterEach(() => {
  vi.unstubAllGlobals();
  removeA11yAttrs();
});

describe('sanitizeA11yPrefs', () => {
  it('returns all defaults for an empty/invalid payload', () => {
    expect(sanitizeA11yPrefs(undefined)).toEqual(DEFAULT_A11Y_PREFS);
    expect(sanitizeA11yPrefs(null)).toEqual(DEFAULT_A11Y_PREFS);
    expect(sanitizeA11yPrefs('nonsense')).toEqual(DEFAULT_A11Y_PREFS);
  });

  it('fills missing fields with defaults (back-compat for older payloads)', () => {
    expect(sanitizeA11yPrefs({ motion: 'reduced' })).toEqual({
      ...DEFAULT_A11Y_PREFS,
      motion: 'reduced',
    });
  });

  it('rejects invalid values and falls back to the default', () => {
    expect(sanitizeA11yPrefs({ textScale: 'huge', focusRing: 9 })).toEqual(
      DEFAULT_A11Y_PREFS,
    );
  });
});

describe('applyA11yPrefs', () => {
  it('writes no behaviour-changing data-* attributes under default prefs', () => {
    applyA11yPrefs(DEFAULT_A11Y_PREFS);
    for (const attr of A11Y_ATTRS) {
      expect(document.documentElement.hasAttribute(attr)).toBe(false);
    }
  });

  it('writes only the attributes that differ from the default', () => {
    applyA11yPrefs({
      ...DEFAULT_A11Y_PREFS,
      textScale: 'lg',
      focusRing: 'enhanced',
    });
    expect(document.documentElement.getAttribute('data-text-scale')).toBe('lg');
    expect(document.documentElement.getAttribute('data-focus')).toBe(
      'enhanced',
    );
    expect(document.documentElement.hasAttribute('data-motion')).toBe(false);
  });

  it('removes an attribute when a preference returns to its default', () => {
    applyA11yPrefs({ ...DEFAULT_A11Y_PREFS, motion: 'reduced' });
    expect(document.documentElement.getAttribute('data-motion')).toBe(
      'reduced',
    );
    applyA11yPrefs(DEFAULT_A11Y_PREFS);
    expect(document.documentElement.hasAttribute('data-motion')).toBe(false);
  });
});

describe('prefersReducedMotion', () => {
  it('reflects the OS media query', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false when the OS does not request reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    expect(prefersReducedMotion()).toBe(false);
  });
});
