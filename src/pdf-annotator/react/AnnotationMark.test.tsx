import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnnotationMark } from './AnnotationMark';
import type { AnnotatorAnnotation } from '../core/types';

const annotation = (overrides: Partial<AnnotatorAnnotation> = {}): AnnotatorAnnotation => ({
  id: 'h1',
  kind: 'highlight',
  page: 1,
  rects: [
    { x: 0.1, y: 0.2, w: 0.3, h: 0.05 },
    { x: 0.1, y: 0.26, w: 0.2, h: 0.05 },
  ],
  quote: 'Lorem ipsum highlights beautifully.',
  color: 'pink',
  createdAt: 1,
  ...overrides,
});

const label = (a: AnnotatorAnnotation): string => `mark:${a.id}:${a.color}`;

describe('AnnotationMark', () => {
  it('renders one tinted span per rect with the colour class', () => {
    const { container } = render(
      <AnnotationMark annotation={annotation()} getMarkLabel={label} />,
    );
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    expect(spans).toHaveLength(2);
    spans.forEach((span) => expect(span).toHaveClass('bg-hl-pink'));
  });

  it('exposes an interactive mark carrying id, colour and the host label', () => {
    render(<AnnotationMark annotation={annotation()} getMarkLabel={label} />);
    const mark = screen.getByTestId('pdf-highlight-mark');
    expect(mark).toHaveAttribute('data-highlight-id', 'h1');
    expect(mark).toHaveAttribute('data-color', 'pink');
    expect(mark).toHaveAccessibleName('mark:h1:pink');
  });
});
