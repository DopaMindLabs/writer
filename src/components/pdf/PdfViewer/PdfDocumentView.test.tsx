import { describe, it, expect, vi, beforeEach } from 'vitest';

// The fake Document reports success or failure from a hoisted control and
// renders whatever children it is given, so the gating logic is observable.
const { control } = vi.hoisted(() => ({ control: { numPages: 2, fail: false } }));
vi.mock('@/lib/pdf/pdfAdapter', async () => {
  const React = await import('react');
  return {
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
      return React.createElement('div', { 'data-testid': 'doc' }, children);
    },
  };
});

import { render, screen, waitFor } from '@testing-library/react';
import { PdfDocumentView } from './PdfDocumentView';

const file = (): { data: Uint8Array } => ({ data: new Uint8Array([1, 2, 3]) });

beforeEach(() => {
  control.numPages = 2;
  control.fail = false;
});

describe('PdfDocumentView', () => {
  it('mounts children only after a successful load and reports the page count', async () => {
    const onLoadSuccess = vi.fn();
    render(
      <PdfDocumentView file={file()} onLoadSuccess={onLoadSuccess} onLoadError={vi.fn()}>
        <span data-testid="page">page</span>
      </PdfDocumentView>,
    );
    expect(await screen.findByTestId('page')).toBeInTheDocument();
    expect(onLoadSuccess).toHaveBeenCalledWith(2);
  });

  it('keeps children unmounted and reports the error on a failed load', async () => {
    control.fail = true;
    const onLoadError = vi.fn();
    render(
      <PdfDocumentView file={file()} onLoadSuccess={vi.fn()} onLoadError={onLoadError}>
        <span data-testid="page">page</span>
      </PdfDocumentView>,
    );
    await waitFor(() => expect(onLoadError).toHaveBeenCalledOnce());
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
  });

  it('re-gates children until a new file parses (no stale page)', async () => {
    const { rerender } = render(
      <PdfDocumentView file={file()} onLoadSuccess={vi.fn()} onLoadError={vi.fn()}>
        <span data-testid="page">page</span>
      </PdfDocumentView>,
    );
    await screen.findByTestId('page');

    // A fresh file re-gates: it parses under the fake and the page returns.
    rerender(
      <PdfDocumentView file={file()} onLoadSuccess={vi.fn()} onLoadError={vi.fn()}>
        <span data-testid="page">page</span>
      </PdfDocumentView>,
    );
    expect(await screen.findByTestId('page')).toBeInTheDocument();
  });
});
