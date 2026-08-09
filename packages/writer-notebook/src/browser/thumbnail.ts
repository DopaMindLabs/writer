import { drawBitmap, fitDimensions } from './imageCanvas';
import { resolveImageLimits } from './imageNormalisation';
import type {
  PageImageProcessingOptions,
  ProcessedRasterImage,
} from './image.types';

const THUMBNAIL_MAX_EDGE = 360;
const THUMBNAIL_MIME = 'image/webp';
const THUMBNAIL_QUALITY = 0.78;

export const createPageThumbnail = async (
  source: ProcessedRasterImage,
  options: PageImageProcessingOptions = {},
): Promise<ProcessedRasterImage> => {
  const limits = resolveImageLimits(options.limits);
  const bitmap = await createImageBitmap(source.blob);
  try {
    const dimensions = fitDimensions(bitmap, THUMBNAIL_MAX_EDGE, limits.maxDecodedPixels);
    const result = await drawBitmap(bitmap, dimensions, THUMBNAIL_MIME, THUMBNAIL_QUALITY);
    if (result.blob.size > limits.maxThumbnailBytes) {
      throw new RangeError('Notebook page thumbnail exceeds the byte limit');
    }
    return result;
  } finally {
    bitmap.close();
  }
};
