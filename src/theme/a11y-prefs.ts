
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

export const DEFAULT_A11Y_PREFS: A11yPrefs = {
  motion: 'auto',
  textScale: 'base',
  lineSpacing: 'normal',
  linkUnderline: 'auto',
  focusRing: 'standard',
};

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

export const sanitizeA11yPrefs = (raw: unknown): A11yPrefs => {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const out = {} as { [K in PrefKey]: A11yPrefs[K] };
  const assign = <K extends PrefKey>(k: K, v: A11yPrefs[K]): void => { out[k] = v; };
  for (const key of PREF_KEYS) assign(key, coerce(key, o[key]));
  return out;
};

export const applyA11yPrefs = (prefs: A11yPrefs): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const key of PREF_KEYS) {
    const { attr } = PREF_SPECS[key];
    if (prefs[key] === DEFAULT_A11Y_PREFS[key]) root.removeAttribute(attr);
    else root.setAttribute(attr, prefs[key]);
  }
};

export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const motionReduced = (): boolean => {
  if (typeof document === 'undefined') return false;
  const motion = document.documentElement.getAttribute('data-motion');
  if (motion === 'reduced') return true;
  if (motion === 'full') return false;
  return prefersReducedMotion();
};
