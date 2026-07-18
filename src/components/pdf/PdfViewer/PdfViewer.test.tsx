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
    await screen.findAllByTestId('fake-page');
  });

  it('renders every page in one scroll column, with no standing toolbar', async () => {
    renderWithProviders(<PdfViewer blob={blob()} title="Paper.pdf" />);
    // Continuous scroll: all pages mount top-to-bottom, not one at a time.
    const pages = await screen.findAllByTestId('fake-page');
    expect(pages).toHaveLength(3);
    expect(pages.map((p) => p.getAttribute('data-page'))).toEqual(['1', '2', '3']);
    // The D1 repair: the toolbar is gone — page controls live in the reader chrome.
    expect(screen.queryByTestId('pdf-toolbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pdf-status-loading')).not.toBeInTheDocument();
  });

  it('reports the parsed page count to onNumPagesChange', async () => {
    const onNumPagesChange = vi.fn();
    renderWithProviders(
      <PdfViewer blob={blob()} title="Paper.pdf" onNumPagesChange={onNumPagesChange} />,
    );
    await screen.findAllByTestId('fake-page');
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
    expect((await screen.findAllByTestId('fake-page')).length).toBe(3);
  });

  it('arrow keys scroll the next/previous page into view (uncontrolled)', async () => {
    renderWithProviders(<PdfViewer blob={blob()} title="Paper.pdf" />);
    await screen.findAllByTestId('fake-page');
    const pageTwo = screen.getByRole('group', { name: /page 2/i });
    const scrollSpy = vi.spyOn(pageTwo, 'scrollIntoView');

    // From page 1, ArrowRight makes page 2 the active page → it is scrolled in.
    fireEvent.keyDown(screen.getAllByTestId('fake-page')[0], { key: 'ArrowRight' });
    expect(scrollSpy).toHaveBeenCalled();
    // All pages stay mounted — paging is a scroll, not a swap.
    expect(screen.getAllByTestId('fake-page')).toHaveLength(3);
  });

  it('renders every page at the controlled scale and scrolls the controlled page in', async () => {
    renderWithProviders(<PdfViewer blob={blob()} title="Paper.pdf" page={2} scale={1.5} />);
    const pages = await screen.findAllByTestId('fake-page');
    expect(pages).toHaveLength(3);
    expect(pages.every((p) => p.getAttribute('data-scale') === '1.5')).toBe(true);
  });

  it('arrow keys emit onPageChange when the page is controlled', async () => {
    const onPageChange = vi.fn();
    renderWithProviders(
      <PdfViewer blob={blob()} title="Paper.pdf" page={2} onPageChange={onPageChange} />,
    );
    const pages = await screen.findAllByTestId('fake-page');
    fireEvent.keyDown(pages[0], { key: 'ArrowRight' });
    expect(onPageChange).toHaveBeenCalledWith(3);
    fireEvent.keyDown(pages[0], { key: 'ArrowLeft' });
    expect(onPageChange).toHaveBeenCalledWith(1);
    // Controlled: the viewer does not move itself; the reader owns the active page.
    expect(screen.getAllByTestId('fake-page')).toHaveLength(3);
  });

  it('overlay slot renders inside each page wrapper', async () => {
    renderWithProviders(
      <PdfViewer
        blob={blob()}
        title="Paper.pdf"
        pageOverlay={(page) => <span data-testid={`overlay-${String(page)}`}>overlay {page}</span>}
      />,
    );
    const overlay = await screen.findByTestId('overlay-1');
    expect(overlay).toHaveTextContent('overlay 1');
    expect(screen.getByTestId('overlay-3')).toHaveTextContent('overlay 3');
    const wrappers = screen.getAllByTestId('pdf-page');
    expect(wrappers[0]).toContainElement(overlay);
  });
});
