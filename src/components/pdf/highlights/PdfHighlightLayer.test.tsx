import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import type { PdfAnnotation } from '@/db/schema';
import { PdfHighlightLayer } from './PdfHighlightLayer';

const mark = (id: string, page: number): PdfAnnotation => ({
  id,
  mediaId: 'm1',
  spaceId: 's1',
  kind: 'highlight',
  page,
  rects: [{ x: 0.1, y: 0.1, w: 0.2, h: 0.05 }],
  quote: id,
  color: 'yellow',
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
});

describe('PdfHighlightLayer', () => {
  it('renders only the marks on the current page', () => {
    renderWithProviders(
      <PdfHighlightLayer
        page={1}
        annotations={[mark('a', 1), mark('b', 2), mark('c', 1)]}
      />,
    );
    expect(screen.getAllByTestId('pdf-highlight-mark')).toHaveLength(2);
  });

  it('renders an empty layer when no highlights are on the page', () => {
    renderWithProviders(<PdfHighlightLayer page={3} annotations={[mark('a', 1)]} />);
    expect(screen.getByTestId('pdf-highlight-layer')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-highlight-mark')).not.toBeInTheDocument();
  });
});
