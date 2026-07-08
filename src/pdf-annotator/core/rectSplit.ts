import type { PdfRect } from './types';

// Page-fraction tolerance: slivers narrower than this (well under a pixel on any
// real page) are treated as nothing, so floating-point offcuts never persist as
// invisible marks.
const EPS = 1e-4;

/** True when two rectangles share more than a sliver of area. */
export const rectsIntersect = (a: PdfRect, b: PdfRect): boolean =>
  a.x + a.w > b.x + EPS &&
  b.x + b.w > a.x + EPS &&
  a.y + a.h > b.y + EPS &&
  b.y + b.h > a.y + EPS;

/**
 * `a` minus `b`: the parts of rectangle `a` not covered by `b`, as up to four
 * edge strips (top, bottom, then left/right of the overlap band). Returns `[a]`
 * unchanged when they do not intersect, and `[]` when `b` fully covers `a`. This
 * is what lets a new highlight recolour only the region it overlaps while the
 * rest of an existing highlight keeps its colour.
 */
export const subtractRect = (a: PdfRect, b: PdfRect): PdfRect[] => {
  if (!rectsIntersect(a, b)) return [a];
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const parts: PdfRect[] = [];

  if (b.y - a.y > EPS) parts.push({ x: a.x, y: a.y, w: a.w, h: b.y - a.y });
  if (ay2 - by2 > EPS) parts.push({ x: a.x, y: by2, w: a.w, h: ay2 - by2 });

  const bandTop = Math.max(a.y, b.y);
  const bandH = Math.min(ay2, by2) - bandTop;
  if (bandH > EPS) {
    if (b.x - a.x > EPS) parts.push({ x: a.x, y: bandTop, w: b.x - a.x, h: bandH });
    if (ax2 - bx2 > EPS) parts.push({ x: bx2, y: bandTop, w: ax2 - bx2, h: bandH });
  }
  return parts;
};

/** `a` minus every rectangle in `cutters`, applied in turn. */
export const subtractRects = (a: PdfRect, cutters: PdfRect[]): PdfRect[] =>
  cutters.reduce<PdfRect[]>(
    (acc, cutter) => acc.flatMap((part) => subtractRect(part, cutter)),
    [a],
  );

/** Every rectangle in `rects`, trimmed by every rectangle in `cutters`. */
export const trimRects = (rects: PdfRect[], cutters: PdfRect[]): PdfRect[] =>
  rects.flatMap((rect) => subtractRects(rect, cutters));

/** True when any rectangle in `as` intersects any rectangle in `bs`. */
export const rectsOverlap = (as: PdfRect[], bs: PdfRect[]): boolean =>
  as.some((a) => bs.some((b) => rectsIntersect(a, b)));
