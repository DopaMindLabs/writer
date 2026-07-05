import { act, renderHook, waitFor } from '@testing-library/react';

// Mock only the pdfjs adapter seam; the media facade runs for real against
// fake-indexeddb.
const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('@/lib/pdf/pdfAdapter', () => ({
  pdfjs: { getDocument, GlobalWorkerOptions: { workerSrc: '' } },
}));

import { db } from '@/db/db';
import { PDF_MIME } from '@/data/media';
import { AllProviders } from '@/test/test-utils';
import { useMediaUpload } from './useMediaUpload';

const PDF_HEAD = [0x25, 0x50, 0x44, 0x46, 1, 2, 3];

const pdfFile = (name = 'doc.pdf'): File =>
  new File([new Uint8Array(PDF_HEAD)], name, { type: PDF_MIME });

const textFile = (name = 'note.txt'): File =>
  new File([new Uint8Array([1, 2, 3])], name, { type: 'text/plain' });

const mockPages = (numPages: number): void => {
  getDocument.mockReturnValue({
    promise: Promise.resolve({ numPages }),
    destroy: vi.fn().mockResolvedValue(undefined),
  });
};

beforeEach(() => {
  getDocument.mockReset();
});

describe('useMediaUpload', () => {
  it('adds an accepted pdf and reports no rejections', async () => {
    mockPages(2);
    const { result } = renderHook(() => useMediaUpload('s1'), {
      wrapper: AllProviders,
    });
    act(() => {
      result.current.uploadFiles([pdfFile('a.pdf')]);
    });
    await waitFor(async () => {
      expect(await db.media.count()).toBe(1);
    });
    expect(result.current.rejected).toEqual([]);
    expect(result.current.busy).toBe(false);
  });

  it('collects a rejection message for a non-pdf and adds nothing', async () => {
    const { result } = renderHook(() => useMediaUpload('s1'), {
      wrapper: AllProviders,
    });
    act(() => {
      result.current.uploadFiles([textFile('x.txt')]);
    });
    await waitFor(() => {
      expect(result.current.rejected).toHaveLength(1);
    });
    expect(result.current.rejected[0]).toContain('x.txt');
    expect(await db.media.count()).toBe(0);
  });

  it('dismisses collected rejection messages', async () => {
    const { result } = renderHook(() => useMediaUpload('s1'), {
      wrapper: AllProviders,
    });
    act(() => {
      result.current.uploadFiles([textFile('x.txt')]);
    });
    await waitFor(() => {
      expect(result.current.rejected).toHaveLength(1);
    });
    act(() => {
      result.current.dismissRejected();
    });
    expect(result.current.rejected).toEqual([]);
  });
});
