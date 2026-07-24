import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { PdfViewerStatus } from './PdfViewerStatus';

describe('PdfViewerStatus', () => {
  it('renders a polite, motion-free skeleton while loading', () => {
    renderWithProviders(<PdfViewerStatus status="loading" />);
    const region = screen.getByTestId('pdf-status-loading');
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent(/rendering page/i);
  });

  it('renders an error banner with a working retry', async () => {
    const onRetry = vi.fn();
    renderWithProviders(<PdfViewerStatus status="error" onRetry={onRetry} />);
    expect(screen.getByTestId('pdf-status-error')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders the error banner without a retry handler', () => {
    renderWithProviders(<PdfViewerStatus status="error" />);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
