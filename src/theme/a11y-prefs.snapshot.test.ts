import { afterEach, describe, expect, it } from 'vitest';
import { applyA11yPrefs, DEFAULT_A11Y_PREFS } from './a11y-prefs';

/**
 * Snapshots the `<html>` attribute state the accessibility preference layer
 * produces. The default snapshot proves no behaviour-changing `data-*` is
 * applied until the user opts in; each opt-in state is captured in its own
 * snapshot so additive states are tested without ever editing the default.
 */

const A11Y_ATTRS = [
  'data-motion',
  'data-text-scale',
  'data-line-spacing',
  'data-link-underline',
  'data-focus',
];

const snapshotHtmlAttrs = (): Record<string, string | null> =>
  Object.fromEntries(
    A11Y_ATTRS.map((attr) => [
      attr,
      document.documentElement.getAttribute(attr),
    ]),
  );

afterEach(() => {
  for (const attr of A11Y_ATTRS) {
    document.documentElement.removeAttribute(attr);
  }
});

describe('a11y preference layer document state', () => {
  it('writes no behaviour-changing attributes at the default (snapshot)', () => {
    applyA11yPrefs(DEFAULT_A11Y_PREFS);
    expect(snapshotHtmlAttrs()).toMatchSnapshot();
  });

  it('larger text size is an isolated opt-in (snapshot)', () => {
    applyA11yPrefs({ ...DEFAULT_A11Y_PREFS, textScale: 'lg' });
    expect(snapshotHtmlAttrs()).toMatchSnapshot();
  });

  it('reduced motion is an isolated opt-in (snapshot)', () => {
    applyA11yPrefs({ ...DEFAULT_A11Y_PREFS, motion: 'reduced' });
    expect(snapshotHtmlAttrs()).toMatchSnapshot();
  });

  it('enhanced focus is an isolated opt-in (snapshot)', () => {
    applyA11yPrefs({ ...DEFAULT_A11Y_PREFS, focusRing: 'enhanced' });
    expect(snapshotHtmlAttrs()).toMatchSnapshot();
  });

  it('every non-default preference together (snapshot)', () => {
    applyA11yPrefs({
      motion: 'reduced',
      textScale: 'xl',
      lineSpacing: 'loose',
      linkUnderline: 'always',
      focusRing: 'enhanced',
    });
    expect(snapshotHtmlAttrs()).toMatchSnapshot();
  });
});
