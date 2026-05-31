import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useA11y } from '@/store/a11y';
import { applyA11yPrefs } from './a11y-prefs';

/**
 * Applies the accessibility preference layer to the document element. Composes
 * with `ThemeProvider` (which owns `data-theme`); this provider owns the
 * orthogonal `data-motion` / `data-text-scale` / `data-line-spacing` /
 * `data-link-underline` / `data-focus` attributes. Under default preferences it
 * writes nothing, leaving the existing experience untouched.
 */
export const A11yPreferenceProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const motion = useA11y((s) => s.motion);
  const textScale = useA11y((s) => s.textScale);
  const lineSpacing = useA11y((s) => s.lineSpacing);
  const linkUnderline = useA11y((s) => s.linkUnderline);
  const focusRing = useA11y((s) => s.focusRing);

  useEffect(() => {
    applyA11yPrefs({ motion, textScale, lineSpacing, linkUnderline, focusRing });
  }, [motion, textScale, lineSpacing, linkUnderline, focusRing]);

  return <>{children}</>;
};
