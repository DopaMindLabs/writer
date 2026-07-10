import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { A11yPreferenceProvider } from './A11yPreferenceProvider';
import { useA11y } from '@/store/a11y';
import { DEFAULT_A11Y_PREFS } from './a11y-prefs';

const A11Y_ATTRS = [
  'data-motion',
  'data-text-scale',
  'data-line-spacing',
  'data-link-underline',
  'data-focus',
];

beforeEach(() => {
  localStorage.clear();
  useA11y.setState({ ...DEFAULT_A11Y_PREFS });
  for (const attr of A11Y_ATTRS) {
    document.documentElement.removeAttribute(attr);
  }
});

afterEach(() => {
  cleanup();
});

describe('A11yPreferenceProvider', () => {
  it('applies no behaviour-changing attributes under default prefs', () => {
    render(<A11yPreferenceProvider>content</A11yPreferenceProvider>);
    for (const attr of A11Y_ATTRS) {
      expect(document.documentElement.hasAttribute(attr)).toBe(false);
    }
  });

  it('reflects a preference change onto the document element', () => {
    render(<A11yPreferenceProvider>content</A11yPreferenceProvider>);
    act(() => {
      useA11y.getState().setTextScale('xl');
    });
    expect(document.documentElement.getAttribute('data-text-scale')).toBe('xl');
  });
});
