import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { PdfThumb } from './PdfThumb';

describe('PdfThumb', () => {
  it('labels the button by page and navigates on click', async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <PdfThumb page={3} active={false} colors={[]} onSelect={onSelect} />,
    );
    const button = screen.getByTestId('pdf-thumb-3');
    expect(button).toHaveAccessibleName('Page 3');
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('marks the active page with an ink border and aria-current', () => {
    renderWithProviders(
      <PdfThumb page={2} active colors={[]} onSelect={vi.fn()} />,
    );
    const button = screen.getByTestId('pdf-thumb-2');
    expect(button).toHaveAttribute('aria-current', 'page');
    expect(button.querySelector('div')).toHaveClass('border-ink');
  });

  it('leaves an inactive page without aria-current or the ink border', () => {
    renderWithProviders(
      <PdfThumb page={2} active={false} colors={[]} onSelect={vi.fn()} />,
    );
    const button = screen.getByTestId('pdf-thumb-2');
    expect(button).not.toHaveAttribute('aria-current');
    expect(button.querySelector('div')).toHaveClass('border-rule');
  });

  it('shows a skeleton until the image resolves, then the image', () => {
    const { rerender } = renderWithProviders(
      <PdfThumb page={1} active={false} colors={[]} onSelect={vi.fn()} />,
    );
    expect(screen.getByTestId('pdf-thumb-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-thumb-1').querySelector('img')).toBeNull();

    rerender(
      <PdfThumb
        page={1}
        active={false}
        colors={[]}
        onSelect={vi.fn()}
        src="data:image/png;base64,AAA"
      />,
    );
    expect(screen.queryByTestId('pdf-thumb-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('pdf-thumb-1').querySelector('img')).toHaveAttribute(
      'src',
      'data:image/png;base64,AAA',
    );
  });

  it('renders one colour tick per distinct highlight, in document order', () => {
    renderWithProviders(
      <PdfThumb page={5} active={false} colors={['yellow', 'pink']} onSelect={vi.fn()} />,
    );
    const ticks = screen.getAllByTestId('pdf-thumb-tick');
    expect(ticks).toHaveLength(2);
    expect(ticks[0]).toHaveClass('bg-hl-yellow');
    expect(ticks[1]).toHaveClass('bg-hl-pink');
  });
});
