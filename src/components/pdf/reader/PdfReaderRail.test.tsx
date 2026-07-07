import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import type { PdfAnnotation } from '@/db/schema';
import { PdfReaderRail } from './PdfReaderRail';

const annotation = (id: string, page: number): PdfAnnotation => ({
  id,
  mediaId: 'm1',
  spaceId: 's1',
  kind: 'highlight',
  page,
  rects: [{ x: 0.1, y: 0.3, w: 0.2, h: 0.04 }],
  quote: id,
  color: 'yellow',
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
});

const setup = (
  overrides: Partial<Parameters<typeof PdfReaderRail>[0]> = {},
) => {
  const props = {
    panel: null,
    annotations: [] as PdfAnnotation[],
    numPages: 10,
    onPanelChange: vi.fn(),
    onNavigateToPage: vi.fn(),
    overflowSlot: <button data-testid="overflow">⋯</button>,
    ...overrides,
  };
  renderWithProviders(<PdfReaderRail {...props} />);
  return props;
};

describe('PdfReaderRail', () => {
  it('opens a panel from a closed rail', async () => {
    const props = setup();
    const glyph = screen.getByTestId('pdf-rail-highlights');
    expect(glyph).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(glyph);
    expect(props.onPanelChange).toHaveBeenCalledWith('highlights');
  });

  it('lights the active glyph and closes it when clicked again', async () => {
    const props = setup({ panel: 'highlights' });
    const glyph = screen.getByTestId('pdf-rail-highlights');
    expect(glyph).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(glyph);
    expect(props.onPanelChange).toHaveBeenCalledWith(null);
  });

  it('switches directly between panels — one open at a time', async () => {
    const props = setup({ panel: 'highlights' });
    await userEvent.click(screen.getByTestId('pdf-rail-info'));
    expect(props.onPanelChange).toHaveBeenCalledWith('info');
  });

  it('shows a count badge on the highlights glyph when there are marks', () => {
    setup({ annotations: [annotation('a', 1), annotation('b', 2)] });
    expect(screen.getByTestId('pdf-rail-highlights-count')).toHaveTextContent('2');
  });

  it('hides the count badge when there are no marks', () => {
    setup();
    expect(screen.queryByTestId('pdf-rail-highlights-count')).not.toBeInTheDocument();
  });

  it('draws ticks only while no panel is open', () => {
    const { rerender } = renderWithProviders(
      <PdfReaderRail
        panel={null}
        annotations={[annotation('a', 3)]}
        numPages={10}
        onPanelChange={vi.fn()}
        onNavigateToPage={vi.fn()}
        overflowSlot={null}
      />,
    );
    expect(screen.getByTestId('pdf-rail-tick')).toBeInTheDocument();
    rerender(
      <PdfReaderRail
        panel="highlights"
        annotations={[annotation('a', 3)]}
        numPages={10}
        onPanelChange={vi.fn()}
        onNavigateToPage={vi.fn()}
        overflowSlot={null}
      />,
    );
    expect(screen.queryByTestId('pdf-rail-tick')).not.toBeInTheDocument();
  });
});
