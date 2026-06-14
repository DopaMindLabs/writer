import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUploadPdf } from './useUploadPdf';
import { addMediaItem, validatePdfFile } from '@/lib/media';
import type { MediaItem } from '@/db/schema';

vi.mock('@/lib/media', () => ({
  validatePdfFile: vi.fn(),
  addMediaItem: vi.fn(),
}));

const file = new File(['%PDF'], 'paper.pdf', { type: 'application/pdf' });
const mockedValidate = vi.mocked(validatePdfFile);
const mockedAdd = vi.mocked(addMediaItem);

describe('useUploadPdf', () => {
  it('stores a valid PDF and reports the new id', async () => {
    mockedValidate.mockResolvedValue({ ok: true });
    mockedAdd.mockResolvedValue({ id: 'm1' } as MediaItem);
    const onUploaded = vi.fn();
    const { result } = renderHook(() => useUploadPdf('s1', onUploaded));

    await result.current.upload([file]);

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledWith('m1');
    });
    expect(result.current.error).toBeNull();
    expect(result.current.busy).toBe(false);
  });

  it('reports a validation failure without storing', async () => {
    mockedValidate.mockResolvedValue({
      ok: false,
      reason: 'mime',
      message: 'Only PDF files are supported.',
    });
    const { result } = renderHook(() => useUploadPdf('s1'));

    await result.current.upload([file]);

    await waitFor(() => {
      expect(result.current.error).toBe('Only PDF files are supported.');
    });
    expect(mockedAdd).not.toHaveBeenCalled();
  });

  it('catches and reports an unexpected failure', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedValidate.mockResolvedValue({ ok: true });
    mockedAdd.mockRejectedValue(new Error('disk full'));
    const { result } = renderHook(() => useUploadPdf('s1'));

    await result.current.upload([file]);

    await waitFor(() => {
      expect(result.current.error).toBe('Upload failed. Please try again.');
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('ignores an empty file list', async () => {
    const { result } = renderHook(() => useUploadPdf('s1'));
    await result.current.upload([]);
    expect(mockedValidate).not.toHaveBeenCalled();
  });
});
