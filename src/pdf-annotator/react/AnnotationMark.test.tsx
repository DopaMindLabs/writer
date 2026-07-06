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

  it('exposes an interactive mark carrying id, kind, colour and the host label', () => {
    render(<AnnotationMark annotation={annotation()} getMarkLabel={label} />);
    const mark = screen.getByTestId('pdf-highlight-mark');
    expect(mark).toHaveAttribute('data-highlight-id', 'h1');
    expect(mark).toHaveAttribute('data-kind', 'highlight');
    expect(mark).toHaveAttribute('data-color', 'pink');
    expect(mark).toHaveAccessibleName('mark:h1:pink');
  });

  it('draws a highlight as a full-rect blended span', () => {
    const { container } = render(
      <AnnotationMark annotation={annotation()} getMarkLabel={label} />,
    );
    const span = container.querySelector<HTMLElement>('span[aria-hidden="true"]');
    expect(span).toHaveClass('mix-blend-multiply');
    expect(span?.style.height).toBe('5%');
  });

  it('draws underline and strikethrough as unblended 2px bars', () => {
    const { container: u } = render(
      <AnnotationMark annotation={annotation({ kind: 'underline' })} getMarkLabel={label} />,
    );
    const uSpan = u.querySelector<HTMLElement>('span[aria-hidden="true"]');
    expect(uSpan).not.toHaveClass('mix-blend-multiply');
    expect(uSpan?.style.height).toBe('2px');
    expect(uSpan?.style.top).toContain('- 2px');

    const { container: s } = render(
      <AnnotationMark annotation={annotation({ kind: 'strikethrough' })} getMarkLabel={label} />,
    );
    const sSpan = s.querySelector<HTMLElement>('span[aria-hidden="true"]');
    expect(sSpan?.style.height).toBe('2px');
    expect(sSpan?.style.top).toContain('- 1px');
  });
});
