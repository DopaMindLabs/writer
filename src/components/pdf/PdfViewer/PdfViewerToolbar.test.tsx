import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { PdfViewerToolbar } from './PdfViewerToolbar';

const baseProps = {
  pageNumber: 2,
  numPages: 5,
  canPrev: true,
  canNext: true,
  canZoomOut: true,
  canZoomIn: true,
  onPrev: vi.fn(),
  onNext: vi.fn(),
  onZoomOut: vi.fn(),
  onZoomIn: vi.fn(),
};

describe('PdfViewerToolbar', () => {
  it('announces the current page politely', () => {
    renderWithProviders(<PdfViewerToolbar {...baseProps} />);
    const readout = screen.getByTestId('pdf-page-readout');
    expect(readout).toHaveAttribute('aria-live', 'polite');
    expect(readout).toHaveTextContent('Page 2 / 5');
  });

  it('wires each control to its handler', async () => {
    const props = {
      ...baseProps,
      onPrev: vi.fn(),
      onNext: vi.fn(),
      onZoomOut: vi.fn(),
      onZoomIn: vi.fn(),
    };
    renderWithProviders(<PdfViewerToolbar {...props} />);
    await userEvent.click(screen.getByRole('button', { name: /previous page/i }));
    await userEvent.click(screen.getByRole('button', { name: /next page/i }));
    await userEvent.click(screen.getByRole('button', { name: /zoom out/i }));
    await userEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    expect(props.onPrev).toHaveBeenCalledOnce();
    expect(props.onNext).toHaveBeenCalledOnce();
    expect(props.onZoomOut).toHaveBeenCalledOnce();
    expect(props.onZoomIn).toHaveBeenCalledOnce();
  });

  it('disables controls at their bounds', () => {
    renderWithProviders(
      <PdfViewerToolbar
        {...baseProps}
        canPrev={false}
        canNext={false}
        canZoomOut={false}
        canZoomIn={false}
      />,
    );
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeDisabled();
  });

  it('renders the extras slot', () => {
    renderWithProviders(
      <PdfViewerToolbar {...baseProps} extras={<span data-testid="extra">hi</span>} />,
    );
    expect(screen.getByTestId('extra')).toBeInTheDocument();
  });
});
