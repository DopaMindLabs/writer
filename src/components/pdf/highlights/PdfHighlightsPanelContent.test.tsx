import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import type { PdfAnnotation } from '@/db/schema';
import { PdfHighlightsPanelContent } from './PdfHighlightsPanelContent';

const highlight = (overrides: Partial<PdfAnnotation> = {}): PdfAnnotation => ({
  id: 'h1',
  mediaId: 'm1',
  spaceId: 's1',
  kind: 'highlight',
  page: 4,
  rects: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.05 }],
  quote: 'a highlighted sentence',
  color: 'yellow',
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

beforeEach(async () => {
  await db.pdfAnnotations.clear();
});

describe('PdfHighlightsPanelContent', () => {
  it('shows the empty caption when there are no highlights', async () => {
    renderWithProviders(<PdfHighlightsPanelContent mediaId="m1" />);
    expect(
      await screen.findByText('Select text in the PDF to highlight it.'),
    ).toBeInTheDocument();
  });

  it('activation jumps to the page and focuses the mark', async () => {
    await db.pdfAnnotations.add(highlight());
    const onNavigateToPage = vi.fn();
    // A stand-in for the mark rendered by the viewer overlay.
    const mark = document.createElement('button');
    mark.setAttribute('data-highlight-id', 'h1');
    document.body.appendChild(mark);

    renderWithProviders(
      <PdfHighlightsPanelContent mediaId="m1" onNavigateToPage={onNavigateToPage} />,
    );
    fireEvent.click(await screen.findByTestId('annotation-row'));

    expect(onNavigateToPage).toHaveBeenCalledWith(4);
    await waitFor(() => {
      expect(mark).toHaveFocus();
    });
    mark.remove();
  });

  it('renders the footer slot', async () => {
    await db.pdfAnnotations.add(highlight());
    renderWithProviders(
      <PdfHighlightsPanelContent
        mediaId="m1"
        footerSlot={<div data-testid="panel-footer">footer</div>}
      />,
    );
    expect(await screen.findByTestId('panel-footer')).toBeInTheDocument();
  });
});
