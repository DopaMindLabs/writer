import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import type { PdfAnnotation } from '@/db/schema';
import { PdfHighlightMark } from './PdfHighlightMark';

const annotation = (overrides: Partial<PdfAnnotation> = {}): PdfAnnotation => ({
  id: 'h1',
  mediaId: 'm1',
  spaceId: 's1',
  kind: 'highlight',
  page: 1,
  rects: [
    { x: 0.1, y: 0.2, w: 0.3, h: 0.05 },
    { x: 0.1, y: 0.26, w: 0.2, h: 0.05 },
  ],
  quote: 'Lorem ipsum highlights beautifully.',
  color: 'pink',
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

describe('PdfHighlightMark', () => {
  it('renders one tinted span per rect with the colour class', () => {
    const { container } = renderWithProviders(<PdfHighlightMark annotation={annotation()} />);
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    expect(spans).toHaveLength(2);
    spans.forEach((span) => expect(span).toHaveClass('bg-hl-pink'));
  });

  it('exposes an interactive mark carrying id, colour and the quote', () => {
    renderWithProviders(<PdfHighlightMark annotation={annotation()} />);
    const mark = screen.getByTestId('pdf-highlight-mark');
    expect(mark).toHaveAttribute('data-highlight-id', 'h1');
    expect(mark).toHaveAttribute('data-color', 'pink');
    expect(mark).toHaveAccessibleName(
      'Highlight, Pink: Lorem ipsum highlights beautifully.',
    );
  });

  it('truncates a long quote in the accessible name to 80 characters', () => {
    const long = 'x'.repeat(200);
    renderWithProviders(<PdfHighlightMark annotation={annotation({ quote: long })} />);
    const name = screen.getByTestId('pdf-highlight-mark').getAttribute('aria-label') ?? '';
    expect(name).toContain('x'.repeat(80));
    expect(name).not.toContain('x'.repeat(81));
  });
});
