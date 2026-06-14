import { useEffect } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { PdfViewer } from './PdfViewer';

vi.mock('react-pdf', () => ({
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
  Document: ({
    children,
    onLoadSuccess,
    className,
    'aria-hidden': ariaHidden,
  }: {
    children: React.ReactNode;
    onLoadSuccess?: (doc: { numPages: number }) => void;
    className?: string;
    'aria-hidden'?: boolean;
  }) => {
    useEffect(() => {
      onLoadSuccess?.({ numPages: 8 });
    }, [onLoadSuccess]);
    return (
      <div
        data-testid="mock-pdf-doc"
        className={className}
        aria-hidden={ariaHidden ? true : undefined}
      >
        {children}
      </div>
    );
  },
  Page: ({ pageNumber, scale }: { pageNumber: number; scale?: number }) => (
    <div
      data-testid="mock-pdf-page"
      data-page={String(pageNumber)}
      data-scale={String(scale ?? 1)}
    />
  ),
}));

const makeBlob = () => new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], {
  type: 'application/pdf',
});

describe('PdfViewer thumbnail mode', () => {
  it('renders the first page as a decorative thumbnail', async () => {
    render(
      <PdfViewer
        blob={makeBlob()}
        name="paper.pdf"
        mode="thumbnail"
        pageCount={8}
      />,
    );
    const doc = await screen.findByTestId('mock-pdf-doc');
    expect(doc.getAttribute('aria-hidden')).toBe('true');
    expect((await screen.findByTestId('mock-pdf-page')).dataset.page).toBe('1');
  });
});

describe('PdfViewer pane mode', () => {
  it('announces the page summary via aria-live', () => {
    render(
      <PdfViewer
        blob={makeBlob()}
        name="paper.pdf"
        mode="pane"
        pageCount={8}
      />,
    );
    const summary = screen.getByTestId('pdf-viewer-summary');
    expect(summary).toHaveAttribute('aria-live', 'polite');
    expect(summary.textContent).toMatch(/page 1 of 8/);
  });

  it('navigates pages with the toolbar buttons', () => {
    render(
      <PdfViewer
        blob={makeBlob()}
        name="paper.pdf"
        mode="pane"
        pageCount={8}
      />,
    );
    fireEvent.click(screen.getByTestId('pdf-viewer-next'));
    expect(screen.getByTestId('pdf-viewer-summary').textContent).toMatch(
      /page 2 of 8/,
    );
    fireEvent.click(screen.getByTestId('pdf-viewer-prev'));
    expect(screen.getByTestId('pdf-viewer-summary').textContent).toMatch(
      /page 1 of 8/,
    );
  });

  it('navigates pages with arrow keys', () => {
    render(
      <PdfViewer
        blob={makeBlob()}
        name="paper.pdf"
        mode="pane"
        pageCount={8}
      />,
    );
    const region = screen.getByTestId('pdf-viewer');
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(screen.getByTestId('pdf-viewer-summary').textContent).toMatch(
      /page 3 of 8/,
    );
    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    expect(screen.getByTestId('pdf-viewer-summary').textContent).toMatch(
      /page 2 of 8/,
    );
  });

  it('clamps page navigation at the bounds', () => {
    render(
      <PdfViewer
        blob={makeBlob()}
        name="paper.pdf"
        mode="pane"
        pageCount={8}
      />,
    );
    const prev = screen.getByTestId('pdf-viewer-prev');
    expect(prev).toBeDisabled();
    const next = screen.getByTestId('pdf-viewer-next');
    for (let i = 0; i < 20; i += 1) fireEvent.click(next);
    expect(screen.getByTestId('pdf-viewer-summary').textContent).toMatch(
      /page 8 of 8/,
    );
    expect(next).toBeDisabled();
  });

  it('zooms with the toolbar and +/- keys', async () => {
    render(
      <PdfViewer
        blob={makeBlob()}
        name="paper.pdf"
        mode="pane"
        pageCount={8}
      />,
    );
    await screen.findByTestId('mock-pdf-page');
    fireEvent.click(screen.getByTestId('pdf-viewer-zoom-in'));
    const page = screen.getByTestId('mock-pdf-page');
    expect(page.dataset.scale).toBe('1.25');
    fireEvent.keyDown(screen.getByTestId('pdf-viewer'), { key: '-' });
    expect(page.dataset.scale).toBe('1');
  });
});
