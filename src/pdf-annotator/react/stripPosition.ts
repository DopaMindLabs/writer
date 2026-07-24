import type { SelectionCapture } from '../core/types';

const GAP = 8;

export interface StripPosition {
  left: number;
  top: number;
  placement: 'above' | 'below';
}

/**
 * Places the strip above the top-most capture rect, horizontally centred on it
 * and clamped inside the page with an 8px gutter. If there is no room above
 * (the rect sits near the page top), it falls below the bottom-most rect
 * instead. All maths is in the page box's own pixel space.
 */
export const computeStripPosition = (
  capture: SelectionCapture,
  pageBox: { width: number; height: number },
  stripWidth: number,
  stripHeight: number,
): StripPosition => {
  const topRect = capture.rects.reduce((a, b) => (b.y < a.y ? b : a));
  const bottomPx = Math.max(...capture.rects.map((r) => (r.y + r.h) * pageBox.height));
  const centreX = (topRect.x + topRect.w / 2) * pageBox.width;
  const left = Math.min(
    Math.max(centreX - stripWidth / 2, GAP),
    Math.max(pageBox.width - stripWidth - GAP, GAP),
  );
  const above = topRect.y * pageBox.height - stripHeight - GAP;
  if (above < GAP) return { left, top: bottomPx + GAP, placement: 'below' };
  return { left, top: above, placement: 'above' };
};
