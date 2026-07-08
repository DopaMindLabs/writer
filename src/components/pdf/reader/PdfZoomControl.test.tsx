import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { PdfZoomControl } from './PdfZoomControl';

const noop = (): void => {};

const renderControl = (
  props: Partial<React.ComponentProps<typeof PdfZoomControl>> = {},
) =>
  renderWithProviders(
    <PdfZoomControl
      scale={1}
      canZoomIn
      canZoomOut
      onZoomIn={noop}
      onZoomOut={noop}
      onResetZoom={noop}
      {...props}
    />,
  );

describe('PdfZoomControl', () => {
  it('shows the scale as a percentage and resets on the readout', () => {
    const onResetZoom = vi.fn();
    renderControl({ scale: 1.25, onResetZoom });
    expect(screen.getByTestId('pdf-zoom-reset')).toHaveTextContent('125%');
    fireEvent.click(screen.getByTestId('pdf-zoom-reset'));
    expect(onResetZoom).toHaveBeenCalledTimes(1);
  });

  it('wires zoom in and out to their handlers', () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    renderControl({ onZoomIn, onZoomOut });
    fireEvent.click(screen.getByTestId('pdf-zoom-in'));
    fireEvent.click(screen.getByTestId('pdf-zoom-out'));
    expect(onZoomIn).toHaveBeenCalledTimes(1);
    expect(onZoomOut).toHaveBeenCalledTimes(1);
  });

  it('disables zoom in at the maximum and zoom out at the minimum', () => {
    renderControl({ canZoomIn: false });
    expect(screen.getByTestId('pdf-zoom-in')).toBeDisabled();
    expect(screen.getByTestId('pdf-zoom-out')).toBeEnabled();

    renderControl({ canZoomOut: false });
    expect(screen.getAllByTestId('pdf-zoom-out')[1]).toBeDisabled();
  });
});
