import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveSelectionPage } from './selection';

// Builds a container with two pages, each with a text layer, plus a non-text
// node inside page 1 — enough to exercise every rejection branch.
interface Dom {
  container: HTMLElement;
  span1: HTMLElement;
  span2: HTMLElement;
  outside: HTMLElement;
}

const page = (n: number, text: string): { pageEl: HTMLElement; span: HTMLElement } => {
  const pageEl = document.createElement('div');
  pageEl.setAttribute('data-page-number', String(n));
  const textLayer = document.createElement('div');
  textLayer.className = 'textLayer';
  const span = document.createElement('span');
  span.textContent = text;
  textLayer.appendChild(span);
  pageEl.appendChild(textLayer);
  return { pageEl, span };
};

const buildDom = (): Dom => {
  const container = document.createElement('div');
  const p1 = page(1, 'Lorem');
  const p2 = page(2, 'Ipsum');
  const outside = document.createElement('span');
  outside.textContent = 'toolbar';
  p1.pageEl.appendChild(outside); // inside the page, outside the text layer
  container.append(p1.pageEl, p2.pageEl);
  document.body.appendChild(container);
  return { container, span1: p1.span, span2: p2.span, outside };
};

const select = (start: Node, end: Node): Selection => {
  const sel = window.getSelection();
  if (!sel) throw new Error('no selection');
  sel.removeAllRanges();
  const range = document.createRange();
  range.setStart(start.firstChild ?? start, 0);
  range.setEnd(end.firstChild ?? end, 1);
  sel.addRange(range);
  return sel;
};

let dom: Dom;
beforeEach(() => {
  dom = buildDom();
});
afterEach(() => {
  window.getSelection()?.removeAllRanges();
  dom.container.remove();
});

describe('resolveSelectionPage', () => {
  it('resolves the page from a text-layer selection', () => {
    const resolved = resolveSelectionPage(select(dom.span1, dom.span1), dom.container);
    expect(resolved?.page).toBe(1);
    expect(resolved?.pageEl.getAttribute('data-page-number')).toBe('1');
  });

  it('rejects a collapsed selection', () => {
    const sel = window.getSelection();
    if (!sel) throw new Error('no selection');
    sel.removeAllRanges();
    const range = document.createRange();
    range.setStart(dom.span1.firstChild ?? dom.span1, 0);
    range.collapse(true);
    sel.addRange(range);
    expect(resolveSelectionPage(sel, dom.container)).toBeNull();
  });

  it('rejects a cross-page selection', () => {
    expect(resolveSelectionPage(select(dom.span1, dom.span2), dom.container)).toBeNull();
  });

  it('rejects a selection outside the text layer', () => {
    expect(resolveSelectionPage(select(dom.outside, dom.outside), dom.container)).toBeNull();
  });

  it('rejects a page with a non-numeric page number', () => {
    dom.span1.closest('[data-page-number]')?.setAttribute('data-page-number', 'x');
    expect(resolveSelectionPage(select(dom.span1, dom.span1), dom.container)).toBeNull();
  });

  it('rejects a selection whose page is outside the given container', () => {
    // Select inside page 1 but pass an unrelated container that does not hold it.
    const other = document.createElement('div');
    document.body.appendChild(other);
    expect(resolveSelectionPage(select(dom.span1, dom.span1), other)).toBeNull();
    other.remove();
  });
});
