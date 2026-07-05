import type { PdfRect } from '@/db/schema';

/**
 * A text selection captured from a rendered PDF page: the 1-based page number
 * (matching react-pdf's `pageNumber`), the selection rectangles normalised to
 * the page box, and the selected text. Coordinates are resolution-independent so
 * a highlight re-projects correctly at any zoom.
 */
export interface PdfSelectionCapture {
  page: number;
  rects: PdfRect[];
  quote: string;
}

/**
 * Normalises a client rectangle to fractions of the page box, clamped to the
 * page. Returns null for a degenerate page box or a rectangle that starts beyond
 * the page bounds.
 */
export const rectToNormalized = (
  clientRect: DOMRect,
  pageBox: DOMRect,
): PdfRect | null => {
  if (pageBox.width === 0 || pageBox.height === 0) return null;

  const x = Math.max(0, clientRect.left - pageBox.left) / pageBox.width;
  const y = Math.max(0, clientRect.top - pageBox.top) / pageBox.height;
  const w = clientRect.width / pageBox.width;
  const h = clientRect.height / pageBox.height;

  if (x > 1 || y > 1) return null;

  return {
    x: Math.min(1, x),
    y: Math.min(1, y),
    w: Math.min(1 - Math.min(1, x), w),
    h: Math.min(1 - Math.min(1, y), h),
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
): PdfSelectionCapture | null => {
  if (!quote.trim()) return null;
  const normalized = clientRectsToNormalized(rects, pageBox);
  if (normalized.length === 0) return null;
  return { page, rects: normalized, quote };
};
