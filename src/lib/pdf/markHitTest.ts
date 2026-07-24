import type { PdfAnnotation } from '@/db/schema';

/**
 * The id of the topmost mark whose geometry contains a point, or null. Marks are
 * stored as page-fraction rects, so the point is given in the same space (`nx`,
 * `ny` in [0, 1] relative to the page box). Lets a right-click resolve to a mark
 * from where it landed rather than from a DOM hit target — so the mark's own hit
 * layer can stay pointer-transparent and never block text selection. Later marks
 * win, matching paint order.
 */
export const markIdAtPoint = (
  marks: PdfAnnotation[],
  page: number,
  nx: number,
  ny: number,
): string | null => {
  for (let i = marks.length - 1; i >= 0; i -= 1) {
    const mark = marks[i];
    if (mark.page !== page) continue;
    const hit = mark.rects.some(
      (r) => nx >= r.x && nx <= r.x + r.w && ny >= r.y && ny <= r.y + r.h,
    );
    if (hit) return mark.id;
  }
  return null;
};
