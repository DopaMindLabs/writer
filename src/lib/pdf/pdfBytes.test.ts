import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock only the adapter seam. The worker facade is real; it harmlessly writes to
// the mock's GlobalWorkerOptions. getDocument is stubbed per test.
const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('./pdfAdapter', () => ({
  pdfjs: { getDocument, GlobalWorkerOptions: { workerSrc: '' } },
}));

import { sniffPdfMagic, clonePdfBytes, countPdfPages } from './pdfBytes';

const blobOf = (bytes: number[]): Blob => new Blob([new Uint8Array(bytes)]);

beforeEach(() => {
  getDocument.mockReset();
});

describe('sniffPdfMagic', () => {
  it('accepts bytes starting with %PDF', async () => {
    await expect(sniffPdfMagic(blobOf([0x25, 0x50, 0x44, 0x46, 0x2d]))).resolves.toBe(
      true,
    );
  });

  it('rejects bytes without the magic', async () => {
    await expect(sniffPdfMagic(blobOf([0x00, 0x50, 0x44, 0x46]))).resolves.toBe(false);
  });

  it('rejects blobs shorter than four bytes', async () => {
    await expect(sniffPdfMagic(blobOf([0x25, 0x50]))).resolves.toBe(false);
  });
});

describe('clonePdfBytes', () => {
  it('returns an independent copy that does not mutate its source', () => {
    const source = new Uint8Array([1, 2, 3, 4]).buffer;
    const copy = clonePdfBytes(source);
    copy[0] = 99;
    expect(new Uint8Array(source)[0]).toBe(1);
  });

  it('survives a detached earlier copy (the pdfjs transfer case)', () => {
    const master = new Uint8Array([1, 2, 3, 4]).buffer;
    const first = clonePdfBytes(master);
    // Simulate pdfjs transferring/detaching the buffer it was handed.
    structuredClone(first.buffer, { transfer: [first.buffer] });
    expect(first.buffer.byteLength).toBe(0);
    const second = clonePdfBytes(master);
    expect(Array.from(second)).toEqual([1, 2, 3, 4]);
  });
});

describe('countPdfPages', () => {
  it('returns numPages and destroys the loading task', async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 7 }), destroy });
    await expect(countPdfPages(blobOf([0x25, 0x50, 0x44, 0x46]))).resolves.toBe(7);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('destroys the loading task when the promise rejects', async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    getDocument.mockReturnValue({
      promise: Promise.reject(new Error('bad pdf')),
      destroy,
    });
    await expect(countPdfPages(blobOf([0x25, 0x50, 0x44, 0x46]))).rejects.toThrow(
      'bad pdf',
    );
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
