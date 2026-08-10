import { afterEach, describe, expect, it, vi } from 'vitest';
import { processPageImage } from '../src/browser/index';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('page image processor', () => {
  it('produces a bounded normalised source and thumbnail', async () => {
    const bitmaps = [
      { width: 1200, height: 1600, close: vi.fn() },
      { width: 1200, height: 1600, close: vi.fn() },
    ];
    vi.stubGlobal('createImageBitmap', vi.fn().mockImplementation(async () => bitmaps.shift()));
    const canvases: { width: number; height: number }[] = [];
    vi.spyOn(document, 'createElement').mockImplementation(() => {
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: vi.fn() }),
        toBlob: (callback: BlobCallback, type?: string) =>
          callback(new Blob(['encoded'], { type: type ?? 'image/png' })),
      };
      canvases.push(canvas);
      return canvas as unknown as HTMLCanvasElement;
    });

    const result = await processPageImage(
      new File(['photo'], 'page.jpg', { type: 'image/jpeg' }),
    );

    expect(result.source).toMatchObject({ width: 1200, height: 1600, mime: 'image/webp' });
    expect(result.thumbnail).toMatchObject({ width: 270, height: 360, mime: 'image/webp' });
    expect(canvases).toEqual([
      expect.objectContaining({ width: 1200, height: 1600 }),
      expect.objectContaining({ width: 270, height: 360 }),
    ]);
  });
});
