import { buildSelectionCapture } from './geometry';

/**
 * Builds a highlight capture from raw client rectangles. A thin re-export of the
 * geometry helper so selection callers depend on this module, not the geometry
 * internals.
 */
export const captureFromRects = buildSelectionCapture;

const PAGE_ATTR = 'data-page-number';
const TEXT_LAYER = '.textLayer';

const elementOf = (node: Node): Element | null =>
  node instanceof Element ? node : node.parentElement;

const pageOf = (node: Node): HTMLElement | null =>
  elementOf(node)?.closest<HTMLElement>(`[${PAGE_ATTR}]`) ?? null;

/**
 * Resolves the single mounted page a text selection sits on. Walks up from the
 * range's start container to the page wrapper (`[data-page-number]`) and returns
 * null when the selection is collapsed, spans more than one page, or does not
 * sit inside that page's `.textLayer` — the guarantee callers rely on to treat a
 * non-null result as a highlightable selection.
 */
export const resolveSelectionPage = (
  selection: Selection,
  container: HTMLElement,
): { pageEl: HTMLElement; page: number } | null => {
  if (selection.isCollapsed || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const startPage = pageOf(range.startContainer);
  const endPage = pageOf(range.endContainer);
  if (!startPage || startPage !== endPage) return null;
  if (!container.contains(startPage)) return null;

  const textLayer = elementOf(range.startContainer)?.closest(TEXT_LAYER);
  if (!textLayer || !startPage.contains(textLayer)) return null;

  const page = Number(startPage.getAttribute(PAGE_ATTR));
  if (!Number.isInteger(page) || page < 1) return null;

  return { pageEl: startPage, page };
};
