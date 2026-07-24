import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { PdfThumbPager } from './PdfThumbPager';

describe('PdfThumbPager', () => {
  it('reads the current page over the total', () => {
    renderWithProviders(
      <PdfThumbPager pageNumber={3} numPages={10} onPrev={vi.fn()} onNext={vi.fn()} />,
    );
    expect(screen.getByTestId('pdf-thumb-pager')).toHaveTextContent('3 / 10');
  });

  it('steps through pages and disables the ends', async () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    renderWithProviders(
      <PdfThumbPager pageNumber={2} numPages={3} onPrev={onPrev} onNext={onNext} />,
    );
    await userEvent.click(screen.getByTestId('pdf-thumb-pager-prev'));
    await userEvent.click(screen.getByTestId('pdf-thumb-pager-next'));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('disables prev on the first page and next on the last', () => {
    const { rerender } = renderWithProviders(
      <PdfThumbPager pageNumber={1} numPages={3} onPrev={vi.fn()} onNext={vi.fn()} />,
    );
    expect(screen.getByTestId('pdf-thumb-pager-prev')).toBeDisabled();
    rerender(
      <PdfThumbPager pageNumber={3} numPages={3} onPrev={vi.fn()} onNext={vi.fn()} />,
    );
    expect(screen.getByTestId('pdf-thumb-pager-next')).toBeDisabled();
  });
});
