import { formatChord } from '@/lib/shortcuts/formatChord';
import type { PlatformNavigator } from '@/lib/shortcuts/platform';

/**
 * Help articles write a shortcut as an inline code span holding a
 * platform-neutral chord — `kbd:mod+\` — so each reader sees the key they
 * press rather than a fixed glyph. These read that markup; {@link formatChord}
 * does the formatting.
 */

const CHORD_PREFIX = 'kbd:';
const CHORD_SPAN_RE = /`kbd:([^`]+)`/g;

/** The chord an inline code span names, or `null` for ordinary code. */
export const chordOf = (code: string): string | null =>
  code.startsWith(CHORD_PREFIX) && code.length > CHORD_PREFIX.length
    ? code.slice(CHORD_PREFIX.length)
    : null;

/** Article text with every chord span formatted for the running platform. */
export const formatChordSpans = (body: string, nav?: PlatformNavigator): string =>
  body.replace(CHORD_SPAN_RE, (_span, keys: string) => formatChord(keys, nav));
