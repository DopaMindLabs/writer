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
import { PdfPageView } from './PdfPageView';

describe('PdfPageView', () => {
  it('labels the page wrapper and renders the page at scale', () => {
    renderWithProviders(<PdfPageView page={2} numPages={4} scale={1.5} />);
    const wrapper = screen.getByTestId('pdf-page');
    expect(wrapper).toHaveAttribute('role', 'group');
    expect(wrapper).toHaveAttribute('data-page-number', '2');
    expect(wrapper).toHaveAccessibleName('Page 2 of 4');
    expect(screen.getByTestId('fake-page')).toHaveAttribute('data-scale', '1.5');
  });

  it('reports the page element for geometry', () => {
    const onPageElement = vi.fn();
    const { unmount } = renderWithProviders(
      <PdfPageView page={1} numPages={1} scale={1} onPageElement={onPageElement} />,
    );
    expect(onPageElement).toHaveBeenCalledWith(1, expect.any(HTMLElement));
    onPageElement.mockClear();
    unmount();
    expect(onPageElement).toHaveBeenCalledWith(1, null);
  });

  it('renders the overlay slot inside the page wrapper', () => {
    renderWithProviders(
      <PdfPageView
        page={3}
        numPages={3}
        scale={1}
        pageOverlay={(page) => <span data-testid="mark">on {page}</span>}
      />,
    );
    const overlay = screen.getByTestId('pdf-page-overlay');
    expect(overlay).toHaveClass('pointer-events-none');
    expect(screen.getByTestId('mark')).toHaveTextContent('on 3');
  });

  it('omits the overlay slot when no overlay is given', () => {
    renderWithProviders(<PdfPageView page={1} numPages={1} scale={1} />);
    expect(screen.queryByTestId('pdf-page-overlay')).not.toBeInTheDocument();
  });
});
