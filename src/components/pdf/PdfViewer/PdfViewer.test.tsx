import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mock only the adapter seam: a fake Document that reports load success/failure
// from a hoisted control, and a fake Page that stands in for the canvas.
const { control } = vi.hoisted(() => ({ control: { numPages: 3, fail: false } }));
vi.mock('@/lib/pdf/pdfAdapter', async () => {
  const React = await import('react');
  return {
    pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
    Document: ({
      file,
      onLoadSuccess,
      onLoadError,
      children,
    }: {
      file: unknown;
      onLoadSuccess?: (pdf: { numPages: number }) => void;
      onLoadError?: () => void;
      children: React.ReactNode;
    }) => {
      React.useEffect(() => {
        if (control.fail) onLoadError?.();
        else onLoadSuccess?.({ numPages: control.numPages });
      }, [file, onLoadError, onLoadSuccess]);
      return React.createElement('div', { 'data-testid': 'fake-document' }, children);
    },
    Page: ({ pageNumber, scale }: { pageNumber: number; scale: number }) =>
      React.createElement('canvas', {
        'data-testid': 'fake-page',
        'data-page': pageNumber,
        'data-scale': scale,
      }),
  };
});

import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { PdfViewer } from './PdfViewer';

const blob = (): Blob => new Blob(['%PDF-1.4 bytes'], { type: 'application/pdf' });

beforeEach(() => {
  control.numPages = 3;
  control.fail = false;
});

describe('PdfViewer', () => {
  it('shows the skeleton while loading', () => {
    renderWithProviders(<PdfViewer blob={blob()} title="Paper.pdf" />);
    expect(screen.getByTestId('pdf-status-loading')).toBeInTheDocument();
  });

  it('renders the page and toolbar once loaded', async () => {
    renderWithProviders(<PdfViewer blob={blob()} title="Paper.pdf" />);
    expect(await screen.findByTestId('fake-page')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-page-readout')).toHaveTextContent('Page 1 / 3');
    expect(screen.queryByTestId('pdf-status-loading')).not.toBeInTheDocument();
  });

  it('error state offers a retry', async () => {
    control.fail = true;
    renderWithProviders(<PdfViewer blob={blob()} title="Paper.pdf" />);
    const banner = await screen.findByTestId('pdf-status-error');
    expect(banner).toBeInTheDocument();

    // Recover: the retry re-copies the bytes and the next parse succeeds.
    control.fail = false;
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByTestId('fake-page')).toBeInTheDocument();
  });

  it('page navigation respects bounds and announces the page', async () => {
    renderWithProviders(<PdfViewer blob={blob()} title="Paper.pdf" />);
    await screen.findByTestId('fake-page');
    const readout = screen.getByTestId('pdf-page-readout');
    const prev = screen.getByRole('button', { name: /previous page/i });
    const next = screen.getByRole('button', { name: /next page/i });

    expect(prev).toBeDisabled(); // at the first page
    await userEvent.click(next);
    expect(readout).toHaveTextContent('Page 2 / 3');
    await userEvent.click(next);
    expect(readout).toHaveTextContent('Page 3 / 3');
    expect(next).toBeDisabled(); // at the last page
  });

  it('zoom stays within bounds', async () => {
    renderWithProviders(<PdfViewer blob={blob()} title="Paper.pdf" />);
    const page = await screen.findByTestId('fake-page');
    expect(page).toHaveAttribute('data-scale', '1');

    const zoomIn = screen.getByRole('button', { name: /zoom in/i });
    for (let i = 0; i < 6; i += 1) await userEvent.click(zoomIn);
    await waitFor(() =>
      expect(screen.getByTestId('fake-page')).toHaveAttribute('data-scale', '2'),
    );
    expect(zoomIn).toBeDisabled(); // clamped at MAX_SCALE
  });

  it('overlay slot renders inside the page wrapper', async () => {
    renderWithProviders(
      <PdfViewer
        blob={blob()}
        title="Paper.pdf"
        pageOverlay={(page) => <span data-testid="overlay">overlay {page}</span>}
      />,
    );
    const overlay = await screen.findByTestId('overlay');
    expect(overlay).toHaveTextContent('overlay 1');
    expect(screen.getByTestId('pdf-page')).toContainElement(overlay);
  });
});
