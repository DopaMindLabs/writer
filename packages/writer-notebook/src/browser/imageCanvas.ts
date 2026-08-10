import type { ProcessedRasterImage } from './image.types';

export interface ImageDimensions {
  readonly width: number;
  readonly height: number;
}

export const fitDimensions = (
  dimensions: ImageDimensions,
  maxEdge: number,
  maxPixels: number,
): ImageDimensions => {
  const { width, height } = dimensions;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError('Decoded image has invalid dimensions');
  }
  const scale = Math.min(1, maxEdge / width, maxEdge / height, Math.sqrt(maxPixels / (width * height)));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const canvasBlob = (canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Browser could not encode the notebook image'));
    }, mime, quality);
  });

export const drawBitmap = async (
  bitmap: ImageBitmap,
  dimensions: ImageDimensions,
  mime: string,
  quality: number,
): Promise<ProcessedRasterImage> => {
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Browser canvas is unavailable');
  context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);
  const blob = await canvasBlob(canvas, mime, quality);
  if (!blob.type.startsWith('image/')) throw new TypeError('Browser returned an unsupported image type');
  return { blob, mime: blob.type, ...dimensions };
};
