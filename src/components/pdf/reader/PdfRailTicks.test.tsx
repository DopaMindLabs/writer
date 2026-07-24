import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import type { PdfAnnotation } from '@/db/schema';
import { PdfRailTicks } from './PdfRailTicks';

const tick = (id: string, page: number, y: number): PdfAnnotation => ({
  id,
  mediaId: 'm1',
  spaceId: 's1',
  kind: 'highlight',
  page,
  rects: [{ x: 0.1, y, w: 0.3, h: 0.04 }],
  quote: `quote ${id}`,
  color: 'yellow',
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
});

describe('PdfRailTicks', () => {
  it('renders one tick per annotation, labelled by page', () => {
    renderWithProviders(
      <PdfRailTicks
        annotations={[tick('a', 1, 0.5), tick('b', 4, 0.25)]}
        numPages={10}
        onNavigateToPage={vi.fn()}
      />,
    );
    const ticks = screen.getAllByTestId('pdf-rail-tick');
    expect(ticks).toHaveLength(2);
    expect(ticks[0]).toHaveAccessibleName('Highlight on page 1');
    expect(ticks[1]).toHaveAccessibleName('Highlight on page 4');
    // Positioned in proportion to the whole document: page 4, quarter down of 10.
    expect(ticks[1]).toHaveStyle({ top: '32.5%' });
  });

  it('navigates to the annotation page on click', async () => {
    const onNavigateToPage = vi.fn();
    renderWithProviders(
      <PdfRailTicks
        annotations={[tick('a', 7, 0.1)]}
        numPages={12}
        onNavigateToPage={onNavigateToPage}
      />,
    );
    await userEvent.click(screen.getByTestId('pdf-rail-tick'));
    expect(onNavigateToPage).toHaveBeenCalledWith(7);
  });

  it('caps the ticks at 40 for a densely highlighted document', () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      tick(`t${String(i)}`, (i % 10) + 1, 0.5),
    );
    renderWithProviders(
      <PdfRailTicks annotations={many} numPages={10} onNavigateToPage={vi.fn()} />,
    );
    expect(screen.getAllByTestId('pdf-rail-tick')).toHaveLength(40);
  });
});
