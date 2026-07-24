import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { PdfReaderPanelHost } from './PdfReaderPanelHost';

const item: MediaItem = {
  id: 'm1',
  spaceId: 's1',
  name: 'thesis.pdf',
  mime: PDF_MIME,
  size: 2048,
  pageCount: 12,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  createdAt: new Date(2026, 6, 7).getTime(),
  updatedAt: 1,
};

describe('PdfReaderPanelHost', () => {
  it('renders the highlights panel with its title and count', () => {
    renderWithProviders(
      <PdfReaderPanelHost
        panel="highlights"
        item={item}
        annotationCount={4}
        onNavigateToPage={vi.fn()}
      />,
    );
    const panel = screen.getByTestId('pdf-reader-panel');
    expect(panel).toHaveTextContent('Highlights & notes');
    expect(panel).toHaveTextContent('4');
    expect(screen.getByTestId('pdf-highlights-panel')).toBeInTheDocument();
  });

  it('renders the info panel with the document rows', () => {
    renderWithProviders(
      <PdfReaderPanelHost
        panel="info"
        item={item}
        annotationCount={4}
        onNavigateToPage={vi.fn()}
      />,
    );
    expect(screen.getByTestId('pdf-reader-panel')).toHaveTextContent('Document info');
    expect(screen.getByText('thesis.pdf')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-info-highlights')).toHaveTextContent('4');
  });

  it('renders nothing when no panel is open', () => {
    const { container } = renderWithProviders(
      <PdfReaderPanelHost
        panel={null}
        item={item}
        annotationCount={0}
        onNavigateToPage={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
