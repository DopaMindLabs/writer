/**
 * Accessibility preference layer.
 *
 * Preferences are applied additively, *on top of* the existing themes, as
 * orthogonal `data-*` attributes on the document element. Every preference
 * defaults to today's behaviour, so a user who never opens the Accessibility
 * panel sees no change. An attribute is only written when its value differs from
 * the default — the default state leaves `<html>` untouched (only `data-theme`,
 * managed separately, is present).
 */

export type MotionPref = 'auto' | 'reduced' | 'full';
export type TextScale = 'sm' | 'base' | 'lg' | 'xl';
export type LineSpacing = 'normal' | 'relaxed' | 'loose';
export type LinkUnderline = 'auto' | 'always';
export type FocusRing = 'standard' | 'enhanced';

export interface A11yPrefs {
  readonly motion: MotionPref;
  readonly textScale: TextScale;
  readonly lineSpacing: LineSpacing;
  readonly linkUnderline: LinkUnderline;
  readonly focusRing: FocusRing;
}

export const MOTION_PREFS: readonly MotionPref[] = ['auto', 'reduced', 'full'];
export const TEXT_SCALES: readonly TextScale[] = ['sm', 'base', 'lg', 'xl'];
export const LINE_SPACINGS: readonly LineSpacing[] = ['normal', 'relaxed', 'loose'];
export const LINK_UNDERLINES: readonly LinkUnderline[] = ['auto', 'always'];
export const FOCUS_RINGS: readonly FocusRing[] = ['standard', 'enhanced'];

/** Defaults map 1:1 to the app's current behaviour (no visual change). */
export const DEFAULT_A11Y_PREFS: A11yPrefs = {
  motion: 'auto',
  textScale: 'base',
  lineSpacing: 'normal',
  linkUnderline: 'auto',
  focusRing: 'standard',
};

/** Per-preference `data-*` attribute name and the values it accepts. */
const PREF_SPECS = {
  motion: { attr: 'data-motion', allowed: MOTION_PREFS },
  textScale: { attr: 'data-text-scale', allowed: TEXT_SCALES },
  lineSpacing: { attr: 'data-line-spacing', allowed: LINE_SPACINGS },
  linkUnderline: { attr: 'data-link-underline', allowed: LINK_UNDERLINES },
  focusRing: { attr: 'data-focus', allowed: FOCUS_RINGS },
} as const;

type PrefKey = keyof A11yPrefs;
const PREF_KEYS = Object.keys(PREF_SPECS) as PrefKey[];

const coerce = <K extends PrefKey>(key: K, value: unknown): A11yPrefs[K] => {
  const allowed = PREF_SPECS[key].allowed as readonly string[];
  const ok = typeof value === 'string' && allowed.includes(value);
  return (ok ? value : DEFAULT_A11Y_PREFS[key]) as A11yPrefs[K];
};

/**
 * Coerce an unknown (e.g. a persisted blob that predates some fields) into a
 * complete, valid prefs object. Missing or invalid fields fall back to the
 * default — this is what guarantees back-compat for older stored payloads.
 */
export const sanitizeA11yPrefs = (raw: unknown): A11yPrefs => {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const out = {} as { [K in PrefKey]: A11yPrefs[K] };
  for (const key of PREF_KEYS) out[key] = coerce(key, o[key]);
  return out;
};

/**
 * Apply preferences to the document element. Values equal to the default remove
 * their attribute, keeping the default DOM pristine and the change additive.
 */
export const applyA11yPrefs = (prefs: A11yPrefs): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const key of PREF_KEYS) {
    const { attr } = PREF_SPECS[key];
    if (prefs[key] === DEFAULT_A11Y_PREFS[key]) root.removeAttribute(attr);
    else root.setAttribute(attr, prefs[key]);
  }
};

/**
 * Whether the OS currently requests reduced motion. Mirrors the unguarded
 * `window.matchMedia` usage in theme-context.ts (the test env provides it).
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Whether motion (animation, smooth scrolling) should be suppressed: when the
 * user chose Reduced motion, or — unless they forced Full — when the OS requests
 * it. Mirrors the CSS gating in index.css and the tour smooth-scroll gating.
 */
export const motionReduced = (): boolean => {
  if (typeof document === 'undefined') return false;
  const motion = document.documentElement.getAttribute('data-motion');
  if (motion === 'reduced') return true;
  if (motion === 'full') return false;
  return prefersReducedMotion();
};
