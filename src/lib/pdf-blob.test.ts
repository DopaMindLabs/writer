import { vi } from 'vitest';
import { countPages, sniffPdfMagic } from './pdf-blob';

const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

const workerOptions = { workerSrc: '' };

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: workerOptions,
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({ numPages: 7 }),
    destroy: () => Promise.resolve(),
  })),
}));

describe('sniffPdfMagic', () => {
  it('accepts a PDF header and rejects other bytes', async () => {
    expect(await sniffPdfMagic(new Blob([PDF_HEADER]))).toBe(true);
    expect(await sniffPdfMagic(new Blob([new Uint8Array([1, 2, 3, 4])]))).toBe(
      false,
    );
    expect(await sniffPdfMagic(new Blob([new Uint8Array([1])]))).toBe(false);
  });
});

describe('countPages', () => {
  it('counts pages and configures the pdfjs worker when unset', async () => {
    workerOptions.workerSrc = '';
    const pages = await countPages(new Blob([PDF_HEADER]));
    expect(pages).toBe(7);
    // The worker source is self-configured before getDocument runs.
    expect(workerOptions.workerSrc).not.toBe('');
  });

  it('leaves an already-configured worker source untouched', async () => {
    workerOptions.workerSrc = 'blob:existing';
    await countPages(new Blob([PDF_HEADER]));
    expect(workerOptions.workerSrc).toBe('blob:existing');
  });
});
