import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { PdfReaderOverflowMenu } from './PdfReaderOverflowMenu';

const setup = (overrides: Partial<Parameters<typeof PdfReaderOverflowMenu>[0]> = {}) => {
  const props = {
    spaceId: 's1',
    canZoomIn: true,
    canZoomOut: true,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onResetZoom: vi.fn(),
    ...overrides,
  };
  renderWithProviders(<PdfReaderOverflowMenu {...props} />);
  return props;
};

const open = async () => {
  await userEvent.click(screen.getByTestId('pdf-rail-overflow'));
};

describe('PdfReaderOverflowMenu', () => {
  it('offers zoom and open-library actions, never a show/hide action', async () => {
    setup();
    await open();
    expect(await screen.findByRole('menuitem', { name: 'Zoom in' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Zoom out' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Reset zoom' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Open library' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /hide|show/i })).not.toBeInTheDocument();
  });

  it('fires the zoom callbacks', async () => {
    const props = setup();
    await open();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Zoom in' }));
    expect(props.onZoomIn).toHaveBeenCalledOnce();

    await open();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Reset zoom' }));
    expect(props.onResetZoom).toHaveBeenCalledOnce();
  });

  it('disables zoom items at the zoom bounds', async () => {
    setup({ canZoomIn: false, canZoomOut: false });
    await open();
    expect(await screen.findByRole('menuitem', { name: 'Zoom in' })).toHaveAttribute(
      'data-disabled',
    );
    expect(screen.getByRole('menuitem', { name: 'Zoom out' })).toHaveAttribute('data-disabled');
  });
});
