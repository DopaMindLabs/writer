import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { PdfPager } from './PdfPager';

describe('PdfPager', () => {
  it('shows the readout and navigates', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    renderWithProviders(
      <PdfPager pageNumber={2} numPages={5} onPrev={onPrev} onNext={onNext} />,
    );
    expect(screen.getByTestId('pdf-pager')).toHaveTextContent('2 / 5');
    fireEvent.click(screen.getByTestId('pdf-pager-next'));
    fireEvent.click(screen.getByTestId('pdf-pager-prev'));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('disables prev on the first page', () => {
    renderWithProviders(
      <PdfPager pageNumber={1} numPages={5} onPrev={vi.fn()} onNext={vi.fn()} />,
    );
    expect(screen.getByTestId('pdf-pager-prev')).toBeDisabled();
    expect(screen.getByTestId('pdf-pager-next')).toBeEnabled();
  });

  it('disables next on the last page', () => {
    renderWithProviders(
      <PdfPager pageNumber={5} numPages={5} onPrev={vi.fn()} onNext={vi.fn()} />,
    );
    expect(screen.getByTestId('pdf-pager-next')).toBeDisabled();
    expect(screen.getByTestId('pdf-pager-prev')).toBeEnabled();
  });
});
