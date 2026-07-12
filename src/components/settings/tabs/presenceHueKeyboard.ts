const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp']);
const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown']);

/**
 * The swatch a navigation key should move to within a radio group (wrapping at both
 * ends), or null when the key is not one the group handles. Drives the WAI-ARIA
 * radio keyboard model for {@link PresenceHuePicker}.
 */
export const nextHueIndexForKey = (
  key: string,
  from: number,
  count: number,
): number | null => {
  if (NEXT_KEYS.has(key)) return (from + 1) % count;
  if (PREV_KEYS.has(key)) return (from - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
};
