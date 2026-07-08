import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnnotationLayer } from './AnnotationLayer';
import type { AnnotatorAnnotation } from '../core/types';

const mark = (id: string, page: number): AnnotatorAnnotation => ({
  id,
  kind: 'highlight',
  page,
  rects: [{ x: 0.1, y: 0.1, w: 0.2, h: 0.05 }],
  quote: id,
  color: 'yellow',
  createdAt: 1,
});

const label = (a: AnnotatorAnnotation): string => `mark:${a.id}`;

describe('AnnotationLayer', () => {
  it('renders only the marks on the current page', () => {
    render(
      <AnnotationLayer
        page={1}
        annotations={[mark('a', 1), mark('b', 2), mark('c', 1)]}
        getMarkLabel={label}
      />,
    );
    expect(screen.getAllByTestId('pdf-highlight-mark')).toHaveLength(2);
  });

  it('renders an empty layer when no highlights are on the page', () => {
    render(<AnnotationLayer page={3} annotations={[mark('a', 1)]} getMarkLabel={label} />);
    expect(screen.getByTestId('pdf-highlight-layer')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-highlight-mark')).not.toBeInTheDocument();
  });

  it('blends as one isolated group so overlapping tints never compound', () => {
    render(<AnnotationLayer page={1} annotations={[mark('a', 1)]} getMarkLabel={label} />);
    const layer = screen.getByTestId('pdf-highlight-layer');
    expect(layer).toHaveClass('mix-blend-multiply');
    expect(layer).toHaveClass('isolate');
  });
});
