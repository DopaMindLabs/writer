import type { PdfRect, SelectionCapture } from './types';

/**
 * Normalises a client rectangle to fractions of the page box. Clips to the
 * intersection of the two rectangles first, so a rect that never overlaps the
 * page (e.g. on an adjacent page, or above/left of it) is rejected outright
 * rather than clamped into a false highlight at the page's edge. Returns null
 * for a degenerate page box or when the rects do not overlap.
 */
export const rectToNormalized = (
  clientRect: DOMRect,
  pageBox: DOMRect,
): PdfRect | null => {
  if (pageBox.width === 0 || pageBox.height === 0) return null;

  const left = Math.max(clientRect.left, pageBox.left);
  const top = Math.max(clientRect.top, pageBox.top);
  const right = Math.min(clientRect.right, pageBox.right);
  const bottom = Math.min(clientRect.bottom, pageBox.bottom);
  if (right <= left || bottom <= top) return null;

  return {
    x: (left - pageBox.left) / pageBox.width,
    y: (top - pageBox.top) / pageBox.height,
    w: (right - left) / pageBox.width,
    h: (bottom - top) / pageBox.height,
  };
};

/** Projects a normalised rectangle back to pixels for a given page size. */
export const normalizedToPixels = (
  rect: PdfRect,
  pageW: number,
  pageH: number,
): DOMRect => new DOMRect(rect.x * pageW, rect.y * pageH, rect.w * pageW, rect.h * pageH);

/** Normalises every positive-area client rectangle, dropping the rest. */
export const clientRectsToNormalized = (
  rects: DOMRectList | DOMRect[],
  pageBox: DOMRect,
): PdfRect[] => {
  const normalized: PdfRect[] = [];
  for (const rect of Array.from(rects)) {
    if (rect.width > 0 && rect.height > 0) {
      const norm = rectToNormalized(rect, pageBox);
      if (norm && norm.w > 0 && norm.h > 0) normalized.push(norm);
    }
  }
  return normalized;
};

/**
 * Builds a selection capture from raw client rectangles. Returns null when the
 * quote is blank or no rectangle survives normalisation, so callers can treat a
 * non-null result as a persistable highlight.
 */
export const buildSelectionCapture = (
  rects: DOMRectList | DOMRect[],
  pageBox: DOMRect,
  quote: string,
  page: number,
): SelectionCapture | null => {
  if (!quote.trim()) return null;
  const normalized = clientRectsToNormalized(rects, pageBox);
  if (normalized.length === 0) return null;
  return { page, rects: normalized, quote };
};
