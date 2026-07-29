/**
 * Formatters for the two timestamps a device row carries. Kept apart from the
 * components so the wording can be tested against a pinned clock without
 * rendering anything.
 */

/** Whole units, largest first — the granularity a "last seen" line deserves. */
const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/**
 * Bare `en` resolves to US conventions in `Intl` — "March 12, 2026" — but this app
 * writes British English throughout. i18next carries the language as `en`, so pin
 * the region here rather than letting the formatter guess it.
 */
const resolveLocale = (locale: string): string =>
  locale === 'en' ? 'en-GB' : locale;

/** "12 March 2026" — the day a device joined; the time of day is noise here. */
export const formatJoinedAt = (at: number, locale: string): string =>
  new Intl.DateTimeFormat(resolveLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(at));

/**
 * "2 days ago" / "just now". Relative rather than absolute because the only
 * question this line answers is *how long has this device been quiet* — which is
 * what decides whether its slot is worth reclaiming.
 */
export const formatLastSeen = (at: number, now: number, locale: string): string => {
  const format = new Intl.RelativeTimeFormat(resolveLocale(locale), {
    numeric: 'auto',
  });
  const elapsed = now - at;
  for (const [unit, size] of UNITS) {
    const value = Math.round(elapsed / size);
    if (Math.abs(value) >= 1) return format.format(-value, unit);
  }
  // Under a minute — including a row stamped slightly in the future by a device
  // whose clock runs fast, which must not read as "in 1 minute".
  return format.format(0, 'minute');
};
