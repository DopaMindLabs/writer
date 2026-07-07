import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { PdfInfoPanelContent } from './PdfInfoPanelContent';

describe('PdfInfoPanelContent', () => {
  it('renders the name, pages, size, added date and highlight count', () => {
    renderWithProviders(
      <PdfInfoPanelContent
        name="thesis.pdf"
        pageCount={42}
        size={2048}
        createdAt={new Date(2026, 6, 7).getTime()}
        annotationCount={3}
      />,
    );
    expect(screen.getByText('thesis.pdf')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('2.0 kB')).toBeInTheDocument();
    expect(screen.getByText('7 Jul 2026')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-info-highlights')).toHaveTextContent('3');
  });

  it('labels every row', () => {
    renderWithProviders(
      <PdfInfoPanelContent
        name="a.pdf"
        pageCount={1}
        size={10}
        createdAt={0}
        annotationCount={0}
      />,
    );
    for (const label of ['Name', 'Pages', 'Size', 'Added', 'Highlights']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
