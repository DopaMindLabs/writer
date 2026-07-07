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

import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { PdfViewer } from './PdfViewer';

const blob = (): Blob => new Blob(['%PDF-1.4 bytes'], { type: 'application/pdf' });

beforeEach(() => {
  control.numPages = 3;
  control.fail = false;
});

describe('PdfViewer', () => {
  it('shows the skeleton while loading', async () => {
    renderWithProviders(<PdfViewer blob={blob()} title="Paper.pdf" />);
    expect(screen.getByTestId('pdf-status-loading')).toBeInTheDocument();
    // Let the async byte read settle so the state update is wrapped in act().
    await screen.findByTestId('fake-page');
  });

  it('renders the page once loaded, with no standing toolbar', async () => {
    renderWithProviders(<PdfViewer blob={blob()} title="Paper.pdf" />);
    expect(await screen.findByTestId('fake-page')).toBeInTheDocument();
    // The D1 repair: the toolbar is gone — page controls live in the reader chrome.
    expect(screen.queryByTestId('pdf-toolbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pdf-status-loading')).not.toBeInTheDocument();
  });

  it('reports the parsed page count to onNumPagesChange', async () => {
    const onNumPagesChange = vi.fn();
    renderWithProviders(
      <PdfViewer blob={blob()} title="Paper.pdf" onNumPagesChange={onNumPagesChange} />,
    );
    await screen.findByTestId('fake-page');
    expect(onNumPagesChange).toHaveBeenCalledWith(3);
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

  it('arrow keys turn the page within the reading region (uncontrolled)', async () => {
    renderWithProviders(<PdfViewer blob={blob()} title="Paper.pdf" />);
    const page = await screen.findByTestId('fake-page');

    fireEvent.keyDown(page, { key: 'ArrowRight' });
    expect(screen.getByTestId('fake-page')).toHaveAttribute('data-page', '2');
    fireEvent.keyDown(screen.getByTestId('fake-page'), { key: 'ArrowRight' });
    expect(screen.getByTestId('fake-page')).toHaveAttribute('data-page', '3');
    fireEvent.keyDown(screen.getByTestId('fake-page'), { key: 'ArrowRight' }); // clamped
    expect(screen.getByTestId('fake-page')).toHaveAttribute('data-page', '3');
    fireEvent.keyDown(screen.getByTestId('fake-page'), { key: 'ArrowLeft' });
    expect(screen.getByTestId('fake-page')).toHaveAttribute('data-page', '2');
  });

  it('renders the controlled page and scale when provided', async () => {
    renderWithProviders(<PdfViewer blob={blob()} title="Paper.pdf" page={2} scale={1.5} />);
    const page = await screen.findByTestId('fake-page');
    expect(page).toHaveAttribute('data-page', '2');
    expect(page).toHaveAttribute('data-scale', '1.5');
  });

  it('arrow keys emit onPageChange when the page is controlled', async () => {
    const onPageChange = vi.fn();
    renderWithProviders(
      <PdfViewer blob={blob()} title="Paper.pdf" page={2} onPageChange={onPageChange} />,
    );
    const page = await screen.findByTestId('fake-page');
    fireEvent.keyDown(page, { key: 'ArrowRight' });
    expect(onPageChange).toHaveBeenCalledWith(3);
    fireEvent.keyDown(page, { key: 'ArrowLeft' });
    expect(onPageChange).toHaveBeenCalledWith(1);
    // Controlled: the viewer does not move itself; the page stays where the prop says.
    expect(screen.getByTestId('fake-page')).toHaveAttribute('data-page', '2');
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
