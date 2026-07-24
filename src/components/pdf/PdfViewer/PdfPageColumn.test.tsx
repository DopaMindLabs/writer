import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/pdf/pdfAdapter', async () => {
  const React = await import('react');
  return {
    Page: ({ pageNumber, scale }: { pageNumber: number; scale: number }) =>
      React.createElement('canvas', {
        'data-testid': 'fake-page',
        'data-page': pageNumber,
        'data-scale': scale,
      }),
  };
});

import { renderWithProviders, screen } from '@/test/test-utils';
import { PdfPageColumn } from './PdfPageColumn';

describe('PdfPageColumn', () => {
  it('renders one wrapper per page in document order', () => {
    renderWithProviders(<PdfPageColumn numPages={3} scale={1} />);
    const wrappers = screen.getAllByTestId('pdf-page');
    expect(wrappers).toHaveLength(3);
    expect(wrappers.map((w) => w.getAttribute('data-page-number'))).toEqual(['1', '2', '3']);
  });

  it('renders nothing before the page count is known', () => {
    renderWithProviders(<PdfPageColumn numPages={0} scale={1} />);
    expect(screen.queryByTestId('pdf-page')).not.toBeInTheDocument();
  });

  it('passes the scale through to every page', () => {
    renderWithProviders(<PdfPageColumn numPages={2} scale={1.25} />);
    expect(
      screen.getAllByTestId('fake-page').every((p) => p.getAttribute('data-scale') === '1.25'),
    ).toBe(true);
  });

  it('renders the overlay slot on each page', () => {
    renderWithProviders(
      <PdfPageColumn
        numPages={2}
        scale={1}
        pageOverlay={(page) => <span data-testid={`ov-${String(page)}`}>ov {page}</span>}
      />,
    );
    expect(screen.getByTestId('ov-1')).toHaveTextContent('ov 1');
    expect(screen.getByTestId('ov-2')).toHaveTextContent('ov 2');
  });

  it('reports each page element for geometry', () => {
    const onPageElement = vi.fn();
    renderWithProviders(
      <PdfPageColumn numPages={2} scale={1} onPageElement={onPageElement} />,
    );
    expect(onPageElement).toHaveBeenCalledWith(1, expect.any(HTMLElement));
    expect(onPageElement).toHaveBeenCalledWith(2, expect.any(HTMLElement));
  });
});
