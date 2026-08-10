import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  normalisePageImage,
  SUPPORTED_PAGE_IMAGE_MIME_TYPES,
} from '../src/browser/index';

const installCanvas = (encodedSize = 7): { drawImage: ReturnType<typeof vi.fn> } => {
  const drawImage = vi.fn();
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage }),
    toBlob: (callback: BlobCallback, type?: string) => {
      callback(new Blob(['x'.repeat(encodedSize)], { type: type ?? 'image/png' }));
    },
  };
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'canvas') return canvas as unknown as HTMLCanvasElement;
    return document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
  });
  return { drawImage };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('page image normalisation', () => {
  it('orientation-normalises and downsizes a large browser-decoded photo', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 6000, height: 4000, close }),
    );
    const { drawImage } = installCanvas();

    const result = await normalisePageImage(
      new File(['photo'], 'page.jpg', { type: 'image/jpeg' }),
    );

    expect(createImageBitmap).toHaveBeenCalledWith(expect.anything(), {
      imageOrientation: 'from-image',
    });
    expect(result).toMatchObject({ width: 4096, height: 2731, mime: 'image/webp' });
    expect(result.blob.type).toBe('image/webp');
    expect(drawImage).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it.each(['image/svg+xml', 'text/plain', ''])('rejects unsupported input MIME %j', async (mime) => {
    installCanvas();

    await expect(normalisePageImage(new File(['page'], 'page', { type: mime }))).rejects.toThrow(
      'image type',
    );
  });

  it('advertises only bounded raster input types', () => {
    expect(SUPPORTED_PAGE_IMAGE_MIME_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);
  });

  it('rejects an oversized encoded source before decoding', async () => {
    const decoder = vi.fn();
    vi.stubGlobal('createImageBitmap', decoder);

    await expect(
      normalisePageImage(
        new File(['too large'], 'page.jpg', { type: 'image/jpeg' }),
        { limits: { maxSourceBytes: 4 } },
      ),
    ).rejects.toThrow('byte limit');
    expect(decoder).not.toHaveBeenCalled();
  });

  it('closes the decoded bitmap when canvas encoding fails', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 100, height: 200, close }),
    );
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (callback: BlobCallback) => callback(null),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLCanvasElement);

    await expect(
      normalisePageImage(new File(['photo'], 'page.jpg', { type: 'image/jpeg' })),
    ).rejects.toThrow('encode');
    expect(close).toHaveBeenCalledOnce();
  });
});
