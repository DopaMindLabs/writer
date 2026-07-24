import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnotationList } from './AnnotationList';
import type { AnnotatorAnnotation } from '../core/types';

const mark = (overrides: Partial<AnnotatorAnnotation> = {}): AnnotatorAnnotation => ({
  id: 'h1',
  kind: 'highlight',
  page: 1,
  rects: [{ x: 0.1, y: 0.1, w: 0.2, h: 0.05 }],
  quote: 'a quote',
  color: 'yellow',
  createdAt: 1,
  ...overrides,
});

const border = (colorId: string): string => `border-l-hl-${colorId}`;
const groupLabel = (page: number): string => `P. ${page.toString()}`;
const timestamp = (a: AnnotatorAnnotation): string => `t${a.createdAt.toString()}`;

const renderList = (annotations: AnnotatorAnnotation[], onActivate = vi.fn()) =>
  render(
    <AnnotationList
      annotations={annotations}
      colorBorderClassName={border}
      formatGroupLabel={groupLabel}
      formatTimestamp={timestamp}
      onActivate={onActivate}
      emptySlot={<p data-testid="empty">nothing yet</p>}
    />,
  );

describe('AnnotationList', () => {
  it('groups by page ascending and orders by time within a group', () => {
    renderList([
      mark({ id: 'b', page: 2, createdAt: 5 }),
      mark({ id: 'a2', page: 1, createdAt: 9 }),
      mark({ id: 'a1', page: 1, createdAt: 2 }),
    ]);
    const headers = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headers).toEqual(['P. 1', 'P. 2']);
    const rows = screen.getAllByTestId('annotation-row').map((r) => r.getAttribute('data-annotation-id'));
    expect(rows).toEqual(['a1', 'a2', 'b']);
  });

  it('renders the arrow line and off ground for a note row', () => {
    renderList([mark({ note: 'remember this' })]);
    const row = screen.getByTestId('annotation-row');
    expect(row).toHaveClass('bg-paper-2');
    expect(row).toHaveTextContent('↳ remember this');
  });

  it('does not tint a row without a note', () => {
    renderList([mark()]);
    expect(screen.getByTestId('annotation-row')).not.toHaveClass('bg-paper-2');
  });

  it('activates with the annotation', () => {
    const onActivate = vi.fn();
    renderList([mark({ id: 'z' })], onActivate);
    fireEvent.click(screen.getByTestId('annotation-row'));
    expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ id: 'z' }));
  });

  it('renders the empty slot when there are no annotations', () => {
    renderList([]);
    expect(screen.getByTestId('empty')).toBeInTheDocument();
    expect(screen.queryByTestId('annotation-list')).not.toBeInTheDocument();
  });
});
