import userEvent from '@testing-library/user-event';

// Mock only the pdfjs adapter seam so validatePdfFile/addMediaItem run for real
// against fake-indexeddb without needing DOMMatrix. Real pdfjs is exercised in
// the media-library e2e spec.
const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('@/lib/pdf/pdfAdapter', () => ({
  pdfjs: { getDocument, GlobalWorkerOptions: { workerSrc: '' } },
}));

import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { PDF_MIME } from '@/data/media';
import { MediaUploadButton } from './MediaUploadButton';

const PDF_HEAD = [0x25, 0x50, 0x44, 0x46, 1, 2, 3];

const pdfFile = (name = 'doc.pdf'): File =>
  new File([new Uint8Array(PDF_HEAD)], name, { type: PDF_MIME });

// A file the accept filter admits (application/pdf) whose bytes lack the %PDF
// magic, so the facade rejects it as not-pdf — the realistic reject path.
const notReallyPdf = (name = 'broken.pdf'): File =>
  new File([new Uint8Array([1, 2, 3, 4])], name, { type: PDF_MIME });

const mockPagesResolved = (numPages: number): void => {
  getDocument.mockReturnValue({
    promise: Promise.resolve({ numPages }),
    destroy: vi.fn().mockResolvedValue(undefined),
  });
};

const mockPagesDeferred = (): ((numPages: number) => void) => {
  let resolve!: (value: { numPages: number }) => void;
  const promise = new Promise<{ numPages: number }>((res) => {
    resolve = res;
  });
  getDocument.mockReturnValue({
    promise,
    destroy: vi.fn().mockResolvedValue(undefined),
  });
  return (numPages) => {
    resolve({ numPages });
  };
};

beforeEach(() => {
  getDocument.mockReset();
});

describe('MediaUploadButton', () => {
  it('rejects a non-pdf file with a warning banner', async () => {
    renderWithProviders(<MediaUploadButton spaceId="s1" />);

    await userEvent.upload(
      screen.getByTestId('media-upload-input'),
      notReallyPdf('broken.pdf'),
    );

    await waitFor(() => {
      expect(
        screen.getByTestId('media-upload-reject-banner'),
      ).toHaveTextContent('broken.pdf');
    });
    expect(await db.media.count()).toBe(0);
  });

  it('adds an accepted pdf via the facade', async () => {
    mockPagesResolved(3);
    renderWithProviders(<MediaUploadButton spaceId="s1" />);

    await userEvent.upload(
      screen.getByTestId('media-upload-input'),
      pdfFile('paper.pdf'),
    );

    await waitFor(async () => {
      expect(await db.media.count()).toBe(1);
    });
    const [item] = await db.media.toArray();
    expect(item?.name).toBe('paper.pdf');
    expect(item?.spaceId).toBe('s1');
    expect(item?.pageCount).toBe(3);
  });

  it('announces progress politely while adding', async () => {
    const resolvePages = mockPagesDeferred();
    renderWithProviders(<MediaUploadButton spaceId="s1" />);

    await userEvent.upload(
      screen.getByTestId('media-upload-input'),
      pdfFile(),
    );

    const status = screen.getByTestId('media-upload-status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    await waitFor(() => {
      expect(status).toHaveTextContent(/adding pdf/i);
    });

    resolvePages(1);
    await waitFor(() => {
      expect(status).not.toHaveTextContent(/adding pdf/i);
    });
  });

  it('disables the trigger while busy', async () => {
    const resolvePages = mockPagesDeferred();
    renderWithProviders(<MediaUploadButton spaceId="s1" />);

    await userEvent.upload(
      screen.getByTestId('media-upload-input'),
      pdfFile(),
    );

    await waitFor(() => {
      expect(screen.getByTestId('media-upload-button')).toBeDisabled();
    });
    expect(screen.getByTestId('media-upload-input')).toBeDisabled();

    resolvePages(1);
    await waitFor(() => {
      expect(screen.getByTestId('media-upload-button')).toBeEnabled();
    });
  });
});
